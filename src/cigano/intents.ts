/**
 * Comandos que o site faz NA HORA, sem esperar a IA (puro, testável).
 */
export type CiganoIntent =
  | { kind: 'stop' }
  | { kind: 'new_chat' }
  | { kind: 'end_chat' }
  | { kind: 'delete_chat' }
  | { kind: 'nova_consulta' }
  | { kind: 'abrir_mesa' }
  | { kind: 'fazer_cruz' }
  | { kind: 'abrir_pagina'; page: 'interpretacoes' | 'consultas' };

export function normalizar(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_RE = /^(cigano )?(para|pare|parar|chega|silencio|cala|quieto|stop|espera|pera|calma)( cigano)?( por favor)?$/;
const NEW_CHAT_RE = /\b(nova conversa|novo chat|conversa nova|comecar de novo|do zero)\b/;
const END_CHAT_RE = /\b(fecha|fechar|feche|encerra|encerrar|encerre|termina|terminar|finaliza|finalizar)( a| essa| esta| nossa| o)? (conversa|chat)\b/;
const DELETE_CHAT_RE = /\b(apaga|apagar|apague|exclui|excluir|exclua|deleta|deletar|limpa|limpar)\b.{0,14}\b(conversa|conversas|historico|chat)\b/;
const NOVA_CONSULTA_RE = /\b(nova consulta|novo jogo|outra consulta|outra pessoa para jogar|novos dados|novo atendimento)\b/;
const MESA_RE = /\b(abre|abra|abrir|abri|faz|faca|fazer|comeca|comecar|inicia|iniciar|joga|jogar|bota|tira|tirar)\b.{0,12}\b(mesa|jogo|cartas|abertura|baralho)\b|^(abre a mesa|pode jogar|joga|jogar|pode abrir)$/;
const CRUZ_RE = /\b(cruz|jogo da cruz|cinco montes|5 montes|aprofunda|aprofundar)\b/;

export function detectarIntencao(text: string, ctx: { temConsulta: boolean; temAbertura: boolean; temCruz: boolean }): CiganoIntent | null {
  const n = normalizar(text);
  if (!n || n.split(' ').length > 12) return null;
  if (STOP_RE.test(n)) return { kind: 'stop' };
  if (/\b(nao|nunca)\b/.test(n)) return null;
  if (DELETE_CHAT_RE.test(n)) return { kind: 'delete_chat' };
  if (NEW_CHAT_RE.test(n)) return { kind: 'new_chat' };
  if (END_CHAT_RE.test(n)) return { kind: 'end_chat' };
  if (NOVA_CONSULTA_RE.test(n)) return { kind: 'nova_consulta' };
  if (/\b(interpretacoes|minhas leituras das cartas|significado das cartas)\b/.test(n) && /\b(abre|abrir|mostra|editar|ver)\b/.test(n)) return { kind: 'abrir_pagina', page: 'interpretacoes' };
  if (/\b(consultas antigas|historico de consultas|minhas consultas|consultas salvas)\b/.test(n)) return { kind: 'abrir_pagina', page: 'consultas' };
  if (CRUZ_RE.test(n) && ctx.temAbertura && !ctx.temCruz) return { kind: 'fazer_cruz' };
  if (MESA_RE.test(n) && ctx.temConsulta && !ctx.temAbertura) return { kind: 'abrir_mesa' };
  return null;
}

/** A pergunta envolve outra pessoa (amor, sociedade, parceria, curiosidade sobre alguém)? */
export function envolveOutraPessoa(pergunta: string): boolean {
  const n = normalizar(pergunta);
  if (/\b(minha vida amorosa|meu futuro amoroso|vou encontrar alguem|vou casar|sorte no amor)\b/.test(n)) return false;
  return /\b(ele|ela|dele|dela|meu ex|minha ex|namorad[oa]|marido|esposa|mulher dele|ficante|socio|socia|sociedade|parceiro|parceira|parceria|patrao|chefe|cunhad[oa]|sogr[oa]|amante|essa pessoa|aquela pessoa|fulan[oa]|me ama|gosta de mim|vai voltar|me trai|pensa em mim|outra pessoa)\b/.test(n);
}

/** A fala transcrita é eco do próprio Cigano saindo do alto-falante? */
export function pareceEco(transcript: string, recentes: string[]): boolean {
  const words = normalizar(transcript).split(' ').filter((w) => w.length > 2);
  if (words.length < 2) return false;
  const spoken = new Set(normalizar(recentes.join(' ')).split(' ').filter((w) => w.length > 2));
  if (!spoken.size) return false;
  return words.filter((w) => spoken.has(w)).length / words.length >= 0.6;
}

const STOP_WORDS = ['para', 'pare', 'parar', 'chega', 'silencio', 'cala', 'stop', 'quieto'];
export function mandouParar(transcript: string, falando: string): boolean {
  const words = normalizar(transcript).split(' ');
  if (!words.length || words.length > 8) return false;
  const spoken = new Set(normalizar(falando).split(' '));
  return words.some((w) => STOP_WORDS.includes(w) && !spoken.has(w));
}
