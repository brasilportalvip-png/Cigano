/**
 * Ouvido do Froc: escuta em tempo real (Gemini Live). Se não der, usa o
 * reconhecimento de voz do próprio navegador. Só transcreve o que foi falado.
 */
import type { TokenGetter } from './api';
import { startFrocLiveTranscription, FrocLiveSession } from './liveTranscription';

export interface ListenerCallbacks {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEngine?: (engine: 'live' | 'browser') => void;
  onInterrupted?: () => void;
}

export interface FrocListener {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  engine: 'live' | 'browser';
}

/** Junta pedaços finais que chegam picados numa frase só (puro, testável). */
export function mergeFinal(previous: string, piece: string): string {
  const a = previous.trim();
  const b = piece.trim();
  if (!a) return b;
  if (!b) return a;
  if (a.endsWith(b)) return a;
  return `${a} ${b}`.replace(/\s+/g, ' ');
}

/** Detecta o nome do Froc (palavra de chamada) mesmo com erro de transcrição. */
export function hasWakeWord(text: string): boolean {
  return /\b(froc|frog|frock|fróc|froque|frok)\b/i.test(text.normalize('NFC'));
}

function startBrowserRecognition(cb: ListenerCallbacks): FrocListener {
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) throw new Error('Reconhecimento de voz indisponível neste navegador. Digite sua mensagem.');
  let stopped = false;
  let paused = false;
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (ev: any) => {
    if (paused) return;
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      const t = String(r[0]?.transcript || '').trim();
      if (!t) continue;
      if (r.isFinal) cb.onFinal(t); else cb.onPartial(t);
    }
  };
  rec.onerror = (ev: any) => {
    if (ev?.error === 'audio-capture') { cb.onInterrupted?.(); return; }
    if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
      stopped = true;
      cb.onError('O navegador bloqueou o microfone. Libere o microfone para falar com o Cigano.');
    }
  };
  rec.onend = () => { if (!stopped) { try { rec.start(); } catch { /* reinício */ } } };
  rec.start();
  return {
    engine: 'browser',
    pause: () => { paused = true; },
    resume: () => { paused = false; },
    stop: () => { stopped = true; try { rec.stop(); } catch { /* fechado */ } },
  };
}

/**
 * @param getToken null = visitante: usa só o reconhecimento do navegador (grátis, sem custo de IA).
 */
export async function startFrocListener(getToken: TokenGetter | null, cb: ListenerCallbacks): Promise<FrocListener> {
  if (!getToken) {
    const b = startBrowserRecognition(cb);
    cb.onEngine?.('browser');
    return b;
  }
  let fallback: FrocListener | null = null;
  try {
    const live: FrocLiveSession = await startFrocLiveTranscription(getToken, {
      onPartial: cb.onPartial,
      onFinal: cb.onFinal,
      onInterrupted: cb.onInterrupted,
      onError: () => {
        // Live caiu de vez: troca para o reconhecimento do navegador sem desligar a conversa.
        try { fallback = startBrowserRecognition(cb); cb.onEngine?.('browser'); } catch (e: any) { cb.onError(e.message); }
      },
    });
    cb.onEngine?.('live');
    return {
      engine: 'live',
      pause: () => { live.pause(); fallback?.pause(); },
      resume: () => { live.resume(); fallback?.resume(); },
      stop: () => { live.stop(); fallback?.stop(); },
    };
  } catch (err: any) {
    if (/permission|denied|NotAllowed/i.test(String(err?.name || err?.message))) {
      throw new Error('O navegador bloqueou o microfone. Libere o microfone para falar com o Cigano.');
    }
    const b = startBrowserRecognition(cb);
    cb.onEngine?.('browser');
    return b;
  }
}
