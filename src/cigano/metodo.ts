/**
 * O método do Cigano (puro, testável, usado no servidor e na tela).
 *  - Abertura: 3 montes de 7 cartas; cada monte → 1-2-3 primeira resposta, 4-5-6 segunda resposta, 7 coringa.
 *  - Cruz: embaralha de novo; 5 montes de 7 cartas, cada monte lido do mesmo jeito.
 *  - Perguntas (até 5): 7 cartas cada, mesmo jeito.
 * Toda tiragem usa um baralho de 78 cartas recém-embaralhado.
 */
export interface CartaCigano {
  id: string;
  numero: number;
  nome: string;
  arcano: 'maior' | 'menor';
  naipe?: 'copas' | 'espadas' | 'ouros' | 'paus';
  romano?: string;
  palavras: string[];
  luz: string;
  sombra: string;
  conselho: string;
  /** Leitura pessoal do dono para esta carta (tem prioridade). */
  minhaLeitura?: string;
}

export const CARTAS_POR_JOGO = 7;
export const MAX_PERGUNTAS = 5;

export const CRUZ_POSICOES = [
  { n: 1, nome: 'Realidade atual', curto: 'Realidade' },
  { n: 2, nome: 'Ameaça dos pés', curto: 'Pés' },
  { n: 3, nome: 'Presente negativo', curto: 'Negativo' },
  { n: 4, nome: 'Futuro positivo', curto: 'Positivo' },
  { n: 5, nome: 'Ori — cabeça e pensamentos', curto: 'Ori' },
] as const;

/** Como a cruz fica na mesa (linha, coluna) numa grade 3x3:      1 / 4 5 3 / 2 */
export const CRUZ_LAYOUT: Record<number, { linha: number; coluna: number }> = {
  1: { linha: 1, coluna: 2 },
  4: { linha: 2, coluna: 1 },
  5: { linha: 2, coluna: 2 },
  3: { linha: 2, coluna: 3 },
  2: { linha: 3, coluna: 2 },
};

/** Abertura: 3 montes de 7, lidos do mesmo jeito (3 + 3 + coringa). */
export const ABERTURA_MONTES = [
  { n: 1, nome: 'Primeiro monte', curto: '1º monte' },
  { n: 2, nome: 'Segundo monte', curto: '2º monte' },
  { n: 3, nome: 'Terceiro monte', curto: '3º monte' },
] as const;

export interface Grupo {
  titulo: string;
  cartas: number[]; // índices 0..6
}

/** Grupos de leitura de 7 cartas: 3 + 3 + coringa. */
export const GRUPOS_DE_SETE: Grupo[] = [
  { titulo: 'Cartas 1 · 2 · 3 — primeira resposta', cartas: [0, 1, 2] },
  { titulo: 'Cartas 4 · 5 · 6 — segunda resposta', cartas: [3, 4, 5] },
  { titulo: 'Carta 7 — coringa de confirmação', cartas: [6] },
];

export type TipoTiragem = 'abertura' | 'cruz' | 'pergunta';

export interface Tiragem {
  id: string;
  tipo: TipoTiragem;
  criadaEm: string;
  /** pergunta: 7 cartas (consultas antigas: abertura com 7). */
  cartas?: CartaCigano[];
  /** abertura: 3 montes de 7 · cruz: 5 montes de 7 (posição 1..5). */
  montes?: Array<{ posicao: number; nome: string; cartas: CartaCigano[] }>;
  pergunta?: string;
  /** Pergunta que envolve outra pessoa: dados natais dela e comparação. */
  outraPessoa?: { fullName: string; birthDate: string; birthTime?: string | null } | null;
}

/** Tira cartas de um baralho já embaralhado (sem repetir). */
export function tirarCartas(baralho: CartaCigano[], quantidade: number): CartaCigano[] {
  if (quantidade > baralho.length) throw new Error('Cartas insuficientes no baralho.');
  return baralho.slice(0, quantidade);
}

/** Distribui 35 cartas em 5 montes de 7, na ordem da mesa. */
export function montarCruz(baralho: CartaCigano[]): Array<{ posicao: number; nome: string; cartas: CartaCigano[] }> {
  const cartas = tirarCartas(baralho, CARTAS_POR_JOGO * CRUZ_POSICOES.length);
  return CRUZ_POSICOES.map((p, i) => ({ posicao: p.n, nome: p.nome, cartas: cartas.slice(i * 7, i * 7 + 7) }));
}

/** Distribui 21 cartas em 3 montes de 7 (jogo de abertura). */
export function montarAbertura(baralho: CartaCigano[]): Array<{ posicao: number; nome: string; cartas: CartaCigano[] }> {
  const cartas = tirarCartas(baralho, CARTAS_POR_JOGO * ABERTURA_MONTES.length);
  return ABERTURA_MONTES.map((p, i) => ({ posicao: p.n, nome: p.nome, cartas: cartas.slice(i * 7, i * 7 + 7) }));
}

/** Texto da carta para a interpretação (com a leitura pessoal do dono, se houver). */
export function descreverCarta(c: CartaCigano, ordem?: number): string {
  const titulo = `${ordem != null ? `${ordem}. ` : ''}${c.romano ? `${c.romano} — ` : ''}${c.nome}`;
  return [
    titulo,
    c.minhaLeitura ? `   LEITURA DO CIGANO (use esta primeiro): ${c.minhaLeitura}` : null,
    `   Luz: ${c.luz}`,
    c.sombra ? `   Sombra: ${c.sombra}` : null,
    `   Conselho: ${c.conselho}`,
  ].filter(Boolean).join('\n');
}

/** Sete cartas organizadas em 3 + 3 + coringa, prontas para a interpretação. */
export function descreverSete(cartas: CartaCigano[]): string {
  return GRUPOS_DE_SETE.map((g) => `${g.titulo.toUpperCase()}\n${g.cartas.map((i) => descreverCarta(cartas[i], i + 1)).join('\n')}`).join('\n\n');
}
