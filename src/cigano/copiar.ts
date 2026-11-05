/**
 * Textos prontos para copiar e mandar para a pessoa (WhatsApp, Instagram…).
 * Tudo personalizado com o nome e a data dela. Puro e testável.
 */
import { ABERTURA_MONTES, CRUZ_POSICOES, type CartaCigano, type Tiragem } from './metodo.js';
import type { EtapaCigano } from './persona.js';

export interface DadosCopia { fullName: string; birthDate: string; birthTime?: string | null }
export interface ItemCopia { grupo: string; rotulo: string; valor: string; detalhe?: string; sombra?: string }

export const MARCA = 'MAGIA DO TAROT — o Reino Encantado das Cartas';
export const ASSINATURA = '— Cigano · Magia do Tarot, o Reino Encantado das Cartas';

export function dataBR(iso: string): string {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso || '');
}

export function primeiroNome(nome: string): string {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}

export function cabecalho(d: DadosCopia): string {
  return `🔮 ${MARCA}\nConsulta de ${d.fullName} · nascimento ${dataBR(d.birthDate)}${d.birthTime ? ` às ${d.birthTime}` : ''}`;
}

function nomeCarta(c: CartaCigano): string {
  return `${c.romano ? `${c.romano} ` : ''}${c.nome}`;
}

/** As 7 cartas de um monte em 3 linhas: 1ª resposta, 2ª resposta e coringa. */
export function cartasDoMonte(cartas: CartaCigano[]): string {
  if (!cartas?.length) return '';
  const g = (ix: number[]) => ix.filter((i) => cartas[i]).map((i) => `${i + 1}. ${nomeCarta(cartas[i])}`).join(' · ');
  return [`1ª resposta: ${g([0, 1, 2])}`, `2ª resposta: ${g([3, 4, 5])}`, cartas[6] ? `Coringa: 7. ${nomeCarta(cartas[6])}` : ''].filter(Boolean).join('\n');
}

/** Título e cartas de um bloco do Cigano, a partir da etapa que ele interpretou. */
export function tituloDoBloco(etapa: EtapaCigano | undefined, tiragens: Tiragem[]): { titulo: string; cartas: string } {
  const abertura = tiragens.find((t) => t.tipo === 'abertura');
  const cruz = tiragens.find((t) => t.tipo === 'cruz');
  const perguntas = tiragens.filter((t) => t.tipo === 'pergunta');
  if (!etapa || etapa.tipo === 'conversa') return { titulo: 'Palavra do Cigano', cartas: '' };
  if (etapa.tipo === 'apresentacao') return { titulo: 'Seu retrato natal — quem você é', cartas: '' };
  if (etapa.tipo === 'abertura') {
    const n = etapa.posicao || 0;
    const monte = abertura?.montes?.find((m) => m.posicao === n);
    if (monte) return { titulo: `Jogo de abertura — ${ABERTURA_MONTES[n - 1]?.nome.toLowerCase() || `monte ${n}`}`, cartas: cartasDoMonte(monte.cartas) };
    if (abertura?.montes) return { titulo: 'Jogo de abertura — 3 montes', cartas: abertura.montes.map((m) => `${m.posicao}º monte\n${cartasDoMonte(m.cartas)}`).join('\n\n') };
    return { titulo: 'Jogo de abertura', cartas: abertura?.cartas ? cartasDoMonte(abertura.cartas) : '' };
  }
  if (etapa.tipo === 'monte') {
    const monte = cruz?.montes?.find((m) => m.posicao === etapa.posicao);
    const nome = CRUZ_POSICOES.find((p) => p.n === etapa.posicao)?.nome || '';
    return { titulo: `Jogo da cruz — monte ${etapa.posicao}: ${nome}`, cartas: monte ? cartasDoMonte(monte.cartas) : '' };
  }
  if (etapa.tipo === 'sintese_cruz') return { titulo: 'Jogo da cruz', cartas: (cruz?.montes || []).map((m) => `${m.posicao}. ${m.nome}\n${cartasDoMonte(m.cartas)}`).join('\n\n') };
  const t = perguntas[etapa.indice - 1];
  return { titulo: `Pergunta ${etapa.indice}${t?.pergunta ? `: “${t.pergunta}”` : ''}`, cartas: t?.cartas ? cartasDoMonte(t.cartas) : '' };
}

/** Um bloco do Cigano pronto para mandar. */
export function textoDoBloco(p: { dados: DadosCopia | null; titulo: string; cartas?: string; fala: string }): string {
  const linhas = [p.dados ? cabecalho(p.dados) : `🔮 ${MARCA}`, '', `✦ ${p.titulo.toUpperCase()}`];
  if (p.cartas) linhas.push(`🃏 Cartas\n${p.cartas}`, '');
  linhas.push(p.fala.trim(), '', ASSINATURA);
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** O mapa natal inteiro, por grupo, pronto para mandar. */
export function textoDoMapa(d: DadosCopia, itens: ItemCopia[]): string {
  const grupos: string[] = [];
  for (const it of itens) if (!grupos.includes(it.grupo)) grupos.push(it.grupo);
  const partes = grupos.map((g) => `✦ ${g.toUpperCase()}\n${itens.filter((i) => i.grupo === g).map((i) => `• ${i.rotulo}: ${i.valor}${i.detalhe ? ` — ${i.detalhe}` : ''}${i.sombra ? `\n   Cuidado: ${i.sombra}` : ''}`).join('\n')}`);
  return [cabecalho(d), '', `Retrato natal de ${primeiroNome(d.fullName)}`, '', partes.join('\n\n'), '', ASSINATURA].join('\n');
}

/** A consulta inteira (todos os blocos, na ordem). */
export function textoDaConsulta(d: DadosCopia, blocos: Array<{ titulo: string; cartas?: string; fala: string }>): string {
  return [
    cabecalho(d),
    '',
    blocos.map((b) => [`✦ ${b.titulo.toUpperCase()}`, b.cartas ? `🃏 Cartas\n${b.cartas}\n` : '', b.fala.trim()].filter(Boolean).join('\n')).join('\n\n— — —\n\n'),
    '',
    ASSINATURA,
  ].join('\n');
}

/** Copia para a área de transferência (com reserva para aparelhos antigos). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* tenta a reserva */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
