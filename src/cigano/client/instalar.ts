/**
 * Baixar o site como aplicativo (PWA): Android/Chrome/Edge usam o pedido de instalação do navegador;
 * iPhone/iPad mostram o passo a passo (Compartilhar → Adicionar à Tela de Início).
 */
import { useEffect, useState } from 'react';

let pedido: any = null;
const ouvintes = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => { e.preventDefault(); pedido = e; ouvintes.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { pedido = null; ouvintes.forEach((f) => f()); });
}

export function jaInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

export function useInstalarApp() {
  const [, setTick] = useState(0);
  useEffect(() => { const f = () => setTick((t) => t + 1); ouvintes.add(f); return () => { ouvintes.delete(f); }; }, []);
  const instalado = jaInstalado();
  return {
    instalado,
    /** O navegador já deixou instalar com um toque. */
    pronto: !!pedido && !instalado,
    ios: ehIOS() && !instalado,
    instalar: async (): Promise<'ok' | 'recusou' | 'manual'> => {
      if (!pedido) return 'manual';
      pedido.prompt();
      const r = await pedido.userChoice.catch(() => ({ outcome: 'dismissed' }));
      pedido = null;
      ouvintes.forEach((f) => f());
      return r?.outcome === 'accepted' ? 'ok' : 'recusou';
    },
  };
}

/** Registra o service worker (necessário para instalar como aplicativo). */
export function registrarApp(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (location.hostname === 'localhost' && location.port === '5173') return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
}
