/**
 * Histórico das conversas com o Froc (estilo ChatGPT): nova, abrir, excluir.
 * Fica salvo NESTE aparelho, separado por conta. Nada sai do navegador.
 */
export interface SavedTurn { role: 'user' | 'assistant'; text: string }
export interface SavedChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: SavedTurn[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAX_CHATS = 40;
const MAX_TURNS = 200;

function defaultStore(): KeyValueStore | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

const keyFor = (uid: string) => `cigano_conversas_${uid}`;

export function newChatId(): string {
  const r = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `chat_${Date.now().toString(36)}_${r}`;
}

/** Título = começo da primeira coisa que a pessoa disse. */
export function chatTitle(turns: SavedTurn[]): string {
  const first = turns.find((t) => t.role === 'user')?.text?.replace(/\s+/g, ' ').trim();
  if (!first) return 'Conversa com o Cigano';
  return first.length > 48 ? `${first.slice(0, 47)}…` : first;
}

export function listChats(uid: string, store: KeyValueStore | null = defaultStore()): SavedChat[] {
  if (!uid || !store) return [];
  try {
    const raw = JSON.parse(store.getItem(keyFor(uid)) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c: any) => c && typeof c.id === 'string' && Array.isArray(c.turns))
      .sort((a: SavedChat, b: SavedChat) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function write(uid: string, chats: SavedChat[], store: KeyValueStore): void {
  try {
    store.setItem(keyFor(uid), JSON.stringify(chats.slice(0, MAX_CHATS)));
  } catch {
    // Armazenamento cheio: descarta as mais antigas e tenta de novo
    try { store.setItem(keyFor(uid), JSON.stringify(chats.slice(0, Math.max(5, Math.floor(chats.length / 2))))); } catch { /* sem espaço */ }
  }
}

export function saveChat(uid: string, id: string, turns: SavedTurn[], store: KeyValueStore | null = defaultStore(), now = Date.now()): SavedChat | null {
  if (!uid || !store || !id) return null;
  const clean = turns
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));
  if (!clean.some((t) => t.role === 'user')) return null; // não salva conversa vazia (só cumprimento)
  const chats = listChats(uid, store);
  const prev = chats.find((c) => c.id === id);
  const chat: SavedChat = { id, title: chatTitle(clean), createdAt: prev?.createdAt ?? now, updatedAt: now, turns: clean };
  write(uid, [chat, ...chats.filter((c) => c.id !== id)], store);
  return chat;
}

export function getChat(uid: string, id: string, store: KeyValueStore | null = defaultStore()): SavedChat | null {
  return listChats(uid, store).find((c) => c.id === id) || null;
}

export function deleteChat(uid: string, id: string, store: KeyValueStore | null = defaultStore()): void {
  if (!uid || !store) return;
  write(uid, listChats(uid, store).filter((c) => c.id !== id), store);
}

export function deleteAllChats(uid: string, store: KeyValueStore | null = defaultStore()): void {
  if (!uid || !store) return;
  try { store.removeItem(keyFor(uid)); } catch { /* ignora */ }
}

export function formatChatDate(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(d);
  const day = (x: number) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(x));
  if (day(ms) === day(now)) return `hoje, ${fmt({ hour: '2-digit', minute: '2-digit' })}`;
  if (day(ms) === day(now - 86_400_000)) return `ontem, ${fmt({ hour: '2-digit', minute: '2-digit' })}`;
  return fmt({ day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
