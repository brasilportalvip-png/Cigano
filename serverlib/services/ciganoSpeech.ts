import { GoogleGenAI } from '@google/genai';

/**
 * Voz do Cigano (Magia das Crenças) — mesmo sistema de comunicação do Froc.IA (frocia2):
 *  - Fala: Gemini TTS em streaming (PCM 24 kHz), voz masculina "Charon", tom de amigo.
 *  - Escuta: token temporário do Gemini Live para transcrição em tempo real no navegador
 *    (a chave Gemini nunca sai do servidor).
 */
const MAX_SPEECH_CHARACTERS = 1800;
const DEFAULT_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const DEFAULT_VOICE = 'Charon';
export const FROC_SPEECH_SAMPLE_RATE = 24000;
export const FROC_LIVE_MODEL = 'gemini-3.5-transcribe-live';

export function cleanSpeechText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]{0,80}>/g, ' ')
    .replace(/[*_#`~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SPEECH_CHARACTERS);
}

/** Mesmo prompt de voz humanizada do Froc.IA (frocia2/server/ai/neuralSpeechService.ts). */
export function buildFrocSpeechPrompt(text: string): string {
  const transcript = cleanSpeechText(text);
  if (!transcript) throw new Error('speech_text_empty');
  return [
    'Leia exatamente o conteúdo delimitado ao final, sem alterar a fala.',
    'Fale em português brasileiro com voz masculina adulta, natural, calorosa e amigável.',
    'Soa como um amigo próximo conversando com tranquilidade: educado, simpático, gentil e sempre disposto a ajudar.',
    'Use ritmo humano, pausas naturais e entonação acolhedora, sem soar como robô ou locutor.',
    `<fala>${transcript}</fala>`,
  ].join('\n');
}

/** Remove o cabeçalho WAV (44 bytes) se o modelo mandar o áudio embrulhado. */
export function stripWavHeader(buf: Buffer): Buffer {
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    const dataAt = buf.indexOf('data', 12, 'ascii');
    return dataAt >= 0 && dataAt + 8 <= buf.length ? buf.subarray(dataAt + 8) : buf.subarray(44);
  }
  return buf;
}

/**
 * Voz neural do Froc em streaming. O modelo de TTS devolve PCM 16-bit 24 kHz mono por padrão
 * (não aceita escolher o formato: pedir "audio/l16" dá erro 400). Se o streaming falhar antes do
 * primeiro pedaço, usa o modo tradicional do Froc.IA (o áudio inteiro de uma vez) para o Froc nunca ficar mudo.
 */
export async function* synthesizeFrocSpeechStream(apiKey: string, text: string): AsyncGenerator<Buffer> {
  const ai: any = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || DEFAULT_VOICE;
  const prompt = buildFrocSpeechPrompt(text);
  let received = false;
  let first = true;
  try {
    const stream: any = await ai.interactions.create({
      model,
      input: prompt,
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice, language: 'pt-BR' }] },
      stream: true,
    });
    for await (const event of stream) {
      if (event?.event_type !== 'step.delta') continue;
      const delta = event.delta;
      if (delta?.type !== 'audio' || typeof delta.data !== 'string' || !delta.data) continue;
      let audio: Buffer = Buffer.from(delta.data, 'base64');
      if (first) { audio = stripWavHeader(audio); first = false; }
      if (!audio.length) continue;
      received = true;
      yield audio;
    }
  } catch (err: any) {
    if (received) throw err;
    console.warn('[Froc] tts streaming indisponível, usando geração normal:', String(err?.message || err).slice(0, 160));
  }
  if (received) return;

  // Reserva = modo tradicional do Froc.IA: interactions.create sem streaming, output_audio.
  const interaction: any = await ai.interactions.create({
    model,
    input: prompt,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice, language: 'pt-BR' }] },
  });
  const audio = interaction?.output_audio;
  if (!audio?.data) throw new Error('froc_tts_empty_audio');
  const pcm = stripWavHeader(Buffer.from(audio.data, 'base64'));
  // Entrega em pedaços para o navegador começar a tocar logo.
  for (let i = 0; i < pcm.length; i += 9600) yield pcm.subarray(i, Math.min(pcm.length, i + 9600));
}

/** Token de uso único (30 min) para o navegador transcrever a fala em tempo real. */
export async function createLiveTranscriptionToken(apiKey: string): Promise<{ token: string; model: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const newSessionExpiresAt = new Date(Date.now() + 60_000).toISOString();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ uses: 1, expireTime: expiresAt, newSessionExpireTime: newSessionExpiresAt }),
  });
  if (!response.ok) {
    const body: any = await response.json().catch(() => null);
    const msg = String(body?.error?.message || `HTTP ${response.status}`).replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]').slice(0, 300);
    throw new Error(`live_token_provider_error: ${msg}`);
  }
  const result: any = await response.json();
  if (!result?.name) throw new Error('live_token_missing');
  return { token: result.name, model: FROC_LIVE_MODEL, expiresAt };
}
