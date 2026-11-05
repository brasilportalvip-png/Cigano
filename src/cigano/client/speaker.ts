/**
 * Voz do Froc: toca o áudio PCM 24 kHz enquanto ele chega do servidor (streaming),
 * para o Froc começar a falar quase na hora. Sem voz neural, usa a voz do navegador.
 */
import type { TokenGetter } from './api';

const DEFAULT_RATE = 24_000;
const LEAD_SECONDS = 0.12;
/** Junta pedaços pequenos (0,2 s) antes de tocar: voz contínua mesmo com o celular ocupado. */
const MIN_CHUNK_SAMPLES = 4800;

export function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const n = Math.floor(bytes.length / 2);
  const out = new Float32Array(n);
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  for (let i = 0; i < n; i++) {
    const v = view.getInt16(i * 2, true);
    out[i] = v < 0 ? v / 32768 : v / 32767;
  }
  return out;
}

export interface SpeakHandle {
  /** Resolve quando termina de falar (ou foi interrompido). */
  done: Promise<void>;
  stop: () => void;
}

/** Nível de voz (0..1) enquanto fala — anima a boca/olhos do avatar. */
export type LevelListener = (level: number) => void;

/** Pede o áudio da próxima frase enquanto a atual ainda toca (sem silêncio entre as frases). */
export interface FalaPronta { response: Promise<Response>; abort: () => void }

export function prepararFala(getToken: TokenGetter, text: string): FalaPronta {
  const controller = new AbortController();
  const response = (async () => {
    const token = await getToken();
    if (!token) throw new Error('auth');
    return fetch('/api/cigano?op=fala', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
  })();
  response.catch(() => undefined);
  return { response, abort: () => controller.abort() };
}

export function speakFrocNeural(
  getToken: TokenGetter,
  text: string,
  onLevel?: LevelListener,
  pronta?: FalaPronta,
): SpeakHandle {
  const controller = new AbortController();
  const fala = pronta || prepararFala(getToken, text);
  controller.signal.addEventListener('abort', () => fala.abort());
  let ctx: AudioContext | null = null;
  const sources = new Set<AudioBufferSourceNode>();
  let stopped = false;
  let gotAudio = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    sources.forEach((s) => { try { s.stop(); } catch { /* já terminou */ } });
    sources.clear();
    onLevel?.(0);
    void ctx?.close().catch(() => undefined);
  };

  const done = (async () => {
    const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) throw new Error('web_audio_unavailable');
    ctx = new AC({ sampleRate: DEFAULT_RATE, latencyHint: 'playback' });
    void ctx.resume().catch(() => undefined);
    const firstAudio = window.setTimeout(() => { if (!gotAudio) controller.abort(); }, 15_000);
    const res = await fala.response;
    if (controller.signal.aborted) throw new Error('aborted');
    if (!res.ok || !res.body) throw new Error(`tts_http_${res.status}`);
    const rate = Number(res.headers.get('X-Froc-Audio-Sample-Rate')) || DEFAULT_RATE;
    const reader = res.body.getReader();
    let next = 0;
    let rest = new Uint8Array(0);
    const lastRef: { node: AudioBufferSourceNode | null } = { node: null };
    let pending: Float32Array[] = [];
    let pendingLen = 0;
    const schedule = (force: boolean) => {
      if (!ctx || stopped || (!force && pendingLen < MIN_CHUNK_SAMPLES) || !pendingLen) return;
      const samples = new Float32Array(pendingLen);
      let o = 0;
      for (const p of pending) { samples.set(p, o); o += p.length; }
      pending = []; pendingLen = 0;
      const buf = ctx.createBuffer(1, samples.length, rate);
      buf.getChannelData(0).set(samples);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      // Se faltou áudio (internet lenta), dá um respiro em vez de picotar.
      if (!next || next < ctx.currentTime + 0.02) next = ctx.currentTime + (next ? 0.06 : LEAD_SECONDS);
      let peak = 0;
      for (let i = 0; i < samples.length; i += 64) peak = Math.max(peak, Math.abs(samples[i]));
      const startAt = next;
      window.setTimeout(() => !stopped && onLevel?.(Math.min(1, peak * 1.6)), Math.max(0, (startAt - ctx.currentTime) * 1000));
      src.start(startAt);
      next += buf.duration;
      sources.add(src);
      src.onended = () => sources.delete(src);
      lastRef.node = src;
    };
    while (!stopped) {
      const { value, done: end } = await reader.read();
      if (end) break;
      if (!value?.length) continue;
      gotAudio = true;
      window.clearTimeout(firstAudio);
      let bytes: Uint8Array;
      if (rest.length) { bytes = new Uint8Array(rest.length + value.length); bytes.set(rest, 0); bytes.set(value, rest.length); } else bytes = value;
      if (bytes.length % 2) { rest = bytes.slice(-1); bytes = bytes.subarray(0, bytes.length - 1); } else rest = new Uint8Array(0);
      const samples = pcm16ToFloat32(bytes);
      if (!samples.length) continue;
      pending.push(samples);
      pendingLen += samples.length;
      schedule(false);
    }
    schedule(true);
    const last = lastRef.node;
    if (!last && !stopped) throw new Error('tts_no_audio');
    if (last && !stopped && ctx) {
      // Espera terminar, com limite: se o áudio do aparelho foi interrompido (ex.: ferramenta
      // abriu o microfone), não deixa o Froc travado "falando" para sempre.
      const remaining = Math.max(0, next - ctx.currentTime) * 1000 + 1500;
      await new Promise<void>((r) => {
        const t = window.setTimeout(r, remaining);
        last!.addEventListener('ended', () => { window.clearTimeout(t); r(); }, { once: true });
      });
    }
    onLevel?.(0);
    if (!stopped) void ctx?.close().catch(() => undefined);
  })();

  return { done, stop };
}

/** Voz do navegador (reserva) — masculina quando houver. */
export function speakFrocBrowser(text: string, onLevel?: LevelListener): SpeakHandle {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return { done: Promise.resolve(), stop: () => undefined };
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  u.rate = 1.18;
  u.pitch = 0.82;
  const voices = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('pt'));
  u.voice = voices.find((v) => /daniel|ricardo|male|mascul|antonio|felipe/i.test(v.name)) || voices[0] || null;
  let timer: number | null = null;
  const done = new Promise<void>((resolve) => {
    u.onstart = () => { timer = window.setInterval(() => onLevel?.(0.3 + Math.random() * 0.5), 120); };
    const finish = () => { if (timer) window.clearInterval(timer); window.clearTimeout(guard); onLevel?.(0); resolve(); };
    // Alguns celulares nunca disparam "onend": limite pelo tamanho do texto.
    const guard = window.setTimeout(finish, Math.max(4000, text.length * 95));
    u.onend = u.onerror = finish;
  });
  synth.cancel();
  synth.speak(u);
  return { done, stop: () => { synth.cancel(); if (timer) window.clearInterval(timer); onLevel?.(0); } };
}
