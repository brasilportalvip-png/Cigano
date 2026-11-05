/**
 * Consulta do Cigano guardada no servidor: dados natais, mapa, tiragens e perguntas (puro).
 */
import { CRUZ_POSICOES, descreverSete, dicionarioDasCartas, MAX_PERGUNTAS, type CartaCigano, type Tiragem } from './metodo.js';

export interface ConsultaCigano {
  id: string;
  donoUid: string;
  criadaEm: string;
  atualizadaEm: string;
  dados: { fullName: string; birthDate: string; birthTime?: string | null };
  mapaResumo: string;
  mapaItens: Array<{ grupo: string; rotulo: string; valor: string; detalhe?: string }>;
  tiragens: Tiragem[];
  /** Comparações de dados natais feitas para perguntas (por id da tiragem). */
  comparacoes?: Record<string, string>;
}

export function perguntasUsadas(c: Pick<ConsultaCigano, 'tiragens'>): number {
  return c.tiragens.filter((t) => t.tipo === 'pergunta').length;
}

export function podePerguntar(c: Pick<ConsultaCigano, 'tiragens'>): boolean {
  return perguntasUsadas(c) < MAX_PERGUNTAS;
}

/** Texto da consulta para o Cigano interpretar (o que realmente saiu na mesa). */
export function consultaParaTexto(c: ConsultaCigano): string {
  const partes: string[] = [`MAPA NATAL DE ${c.dados.fullName.toUpperCase()}\n${c.mapaResumo}`];
  const todas: CartaCigano[] = [];
  for (const t of c.tiragens) { (t.montes || []).forEach((m) => todas.push(...m.cartas)); todas.push(...(t.cartas || [])); }
  let p = 0;
  for (const t of c.tiragens) {
    if (t.tipo === 'abertura' && t.montes) {
      partes.push(`JOGO DE ABERTURA — 3 MONTES DE 7 (baralho de 78 embaralhado)\n${t.montes.map((m) => `MONTE ${m.posicao} DA ABERTURA — ${m.nome.toUpperCase()}\n${descreverSete(m.cartas, true)}`).join('\n\n')}`);
    } else if (t.tipo === 'abertura' && t.cartas) {
      partes.push(`JOGO DE ABERTURA (baralho de 78 embaralhado)\n${descreverSete(t.cartas, true)}`);
    } else if (t.tipo === 'cruz' && t.montes) {
      partes.push(`JOGO DA CRUZ (embaralhado de novo)\n${t.montes.map((m) => `MONTE ${m.posicao} — ${m.nome.toUpperCase()}\n${descreverSete(m.cartas, true)}`).join('\n\n')}`);
    } else if (t.tipo === 'pergunta' && t.cartas) {
      p += 1;
      const cmp = c.comparacoes?.[t.id];
      partes.push(`PERGUNTA ${p}: "${t.pergunta}"${t.outraPessoa ? `\nOutra pessoa: ${t.outraPessoa.fullName}, nascida em ${t.outraPessoa.birthDate}${t.outraPessoa.birthTime ? ` às ${t.outraPessoa.birthTime}` : ''}` : ''}${cmp ? `\n${cmp}` : ''}\n${descreverSete(t.cartas, true)}`);
    }
  }
  partes.push(`SIGNIFICADO DAS CARTAS QUE SAÍRAM (Tarô de Thoth do Cigano)\n${dicionarioDasCartas(todas)}`);
  return partes.join('\n\n').slice(0, 90000);
}

export const POSICOES_CRUZ = CRUZ_POSICOES;
