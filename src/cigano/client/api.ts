/**
 * Cliente do Cigano: chama /api/cigano com o token do dono e lê a fala em streaming (SSE).
 */
import { auth } from '../../firebase/firebase.js';
import type { CiganoAcao, CiganoEmocao, EtapaCigano } from '../persona.js';
import type { CartaCigano, Tiragem } from '../metodo.js';

export type TokenGetter = () => Promise<string | null>;

export const getToken: TokenGetter = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

export class CiganoApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export interface ItemMapa { grupo: string; rotulo: string; valor: string; detalhe?: string; sombra?: string }
export interface DadosNatais { fullName: string; birthDate: string; birthTime?: string | null }

export interface ConsultaPublica {
  id: string;
  dados: DadosNatais;
  mapaItens: ItemMapa[];
  tiragens: Tiragem[];
  criadaEm: string;
  atualizadaEm: string;
  perguntasUsadas: number;
  perguntasMax: number;
}

async function chamar<T>(op: string, init: { method?: 'GET' | 'POST'; body?: any; query?: Record<string, string> } = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new CiganoApiError('Entre com a sua conta de dono.', 401, 'AUTH_REQUIRED');
  const qs = new URLSearchParams({ op, ...(init.query || {}) }).toString();
  const res = await fetch(`/api/cigano?${qs}`, {
    method: init.method || (init.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new CiganoApiError(data?.error || `Falha (${res.status}).`, res.status, data?.code);
  return data as T;
}

export const cigano = {
  estado: () => chamar<{ dono: boolean; nome: string | null }>('estado'),
  natal: (dados: DadosNatais) => chamar<{ dados: DadosNatais; itens: ItemMapa[] }>('natal', { body: { dados } }),
  abrir: (dados: DadosNatais) => chamar<{ consulta: ConsultaPublica }>('abrir', { body: { dados } }),
  cruz: (consultaId: string) => chamar<{ consulta: ConsultaPublica }>('cruz', { body: { consultaId } }),
  pergunta: (consultaId: string, pergunta: string, outraPessoa?: DadosNatais | null) =>
    chamar<{ consulta: ConsultaPublica; tiragemId: string; indice: number }>('pergunta', { body: { consultaId, pergunta, outraPessoa: outraPessoa || undefined } }),
  consultas: () => chamar<{ consultas: Array<{ id: string; nome: string; nascimento: string; atualizadaEm: string; tiragens: string[]; perguntasUsadas: number }> }>('consultas'),
  consulta: (id: string) => chamar<{ consulta: ConsultaPublica }>('consulta', { query: { id } }),
  cartas: () => chamar<{ cartas: CartaCigano[]; personalizadas: number }>('cartas'),
  salvarCarta: (c: { id: string; luz: string; sombra: string; conselho: string; minhaLeitura: string }) => chamar<{ ok: boolean; carta: CartaCigano }>('cartas', { body: c }),
};

/** Lê um fluxo SSE "event:/data:" (puro, testável). */
export function parseSseChunk(buffer: string): { events: { event: string; data: any }[]; rest: string } {
  const events: { event: string; data: any }[] = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (!data.length) continue;
    try { events.push({ event, data: JSON.parse(data.join('\n')) }); } catch { /* quadro inválido */ }
  }
  return { events, rest };
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export async function ciganoChat(
  payload: { messages: ChatTurn[]; consultaId?: string | null; etapa: EtapaCigano; dados?: DadosNatais | null },
  handlers: { onDelta: (t: string) => void; onDone: (r: { text: string; emotion: CiganoEmocao; actions: CiganoAcao[] }) => void },
  signal?: AbortSignal,
): Promise<void> {
  const token = await getToken();
  if (!token) throw new CiganoApiError('Entre com a sua conta de dono.', 401);
  const res = await fetch('/api/cigano?op=chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) {
    const body: any = await res.json().catch(() => ({}));
    throw new CiganoApiError(body?.error || 'O Cigano não respondeu.', res.status, body?.code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    for (const ev of parsed.events) {
      if (ev.event === 'delta') handlers.onDelta(String(ev.data?.text || ''));
      else if (ev.event === 'done') { finished = true; handlers.onDone(ev.data); }
      else if (ev.event === 'error') throw new CiganoApiError(ev.data?.error || 'Conexão perdida.', 502);
    }
  }
  if (!finished) throw new CiganoApiError('A resposta do Cigano foi interrompida.', 502);
}
