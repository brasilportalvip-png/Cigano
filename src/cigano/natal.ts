/**
 * Mapa natal do Cigano: todos os oráculos calculados a partir de
 * nome completo, data e (se souber) hora de nascimento. Só do servidor.
 */
import { buildConsultaSuprema, gerarComparacaoAmorosaSuprema } from '../oraculos/index.js';
import { calculateLoveSynastry } from '../oraculos/loveSynastryEngine.js';
import { calculateAstrology } from '../oraculos/astrologyEngine.js';
import { calculateCabala } from '../oraculos/cabalaEngine.js';

export interface DadosNatais {
  fullName: string;
  /** AAAA-MM-DD */
  birthDate: string;
  /** HH:MM (opcional) */
  birthTime?: string | null;
}

export interface ItemMapa {
  grupo: 'Astrologia' | 'Numerologia' | 'Cabala' | 'Odù' | 'Búzios';
  rotulo: string;
  valor: string;
  detalhe?: string;
}

export interface MapaNatal {
  dados: DadosNatais;
  itens: ItemMapa[];
  /** Texto completo de todos os oráculos para o Cigano interpretar. */
  resumo: string;
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida e limpa os dados natais (puro). */
export function limparDadosNatais(raw: any): DadosNatais | null {
  const fullName = String(raw?.fullName || '').replace(/[^\p{L}\s'’.-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  const birthDate = String(raw?.birthDate || '').trim();
  const birthTime = String(raw?.birthTime || '').trim();
  if (fullName.split(' ').filter(Boolean).length < 1 || fullName.length < 2) return null;
  if (!DATA_RE.test(birthDate)) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || y < 1900 || dt.getTime() > Date.now()) return null;
  return { fullName, birthDate, birthTime: HORA_RE.test(birthTime) ? birthTime : null };
}

const INSTRUCAO_RE = /^\s*(ORIENTAÇÃO|ORIENTACAO|DIRETRIZ|DIRETRIZES|INSTRUÇÕES|INSTRUCOES|COMO USAR|REGRAS PARA|VOZ DE|TOM DE VOZ)\b/i;

/** Deixa só os DADOS de cada oráculo: corta as instruções de voz que vêm junto com os oráculos. */
export function soOsDados(resumo: string): string {
  const linhas = String(resumo || '').split('\n');
  const corte = linhas.findIndex((l) => INSTRUCAO_RE.test(l));
  return (corte >= 0 ? linhas.slice(0, corte) : linhas).join('\n').trim();
}

/** O Cigano é quem fala: tira qualquer linha que diga à IA para falar como outra entidade. */
export function vozDoCigano(texto: string): string {
  return String(texto || '')
    .split('\n')
    .filter((l) => !/^\s*Você é (?!o Cigano)/i.test(l))
    .join('\n');
}

const n = (v: any) => (v == null || v === '' ? '—' : String(v));
const pick = (o: any, ...keys: string[]) => keys.map((k) => o?.[k]).find((v) => v != null && v !== '');

export function montarMapaNatal(dados: DadosNatais): MapaNatal {
  const c: any = buildConsultaSuprema({ fullName: dados.fullName, birthDate: dados.birthDate, birthTime: dados.birthTime || null, question: '' });
  const astro = calculateAstrology(dados.birthDate, dados.birthTime || null);
  const cab = calculateCabala(dados.birthDate);
  const num = c.numerologia || {};
  const it = num.interpretacoes || {};
  const odu = c.odu?.odu?.principal || {};
  const buz = c.buzios?.buzios?.principal || {};
  const seph = c.cabala?.cabala?.sephirah || {};

  const itens: ItemMapa[] = [
    { grupo: 'Astrologia', rotulo: 'Signo solar', valor: n(astro.sunSign), detalhe: `${astro.element} · ${astro.modality}` },
    { grupo: 'Astrologia', rotulo: 'Fase da Lua no nascimento', valor: n(astro.lunarPhase), detalhe: astro.lunarPhaseDescription },
    { grupo: 'Astrologia', rotulo: 'Regente da hora', valor: astro.hourKnown ? n(astro.planetaryHourRuler) : 'hora não informada' },
    { grupo: 'Numerologia', rotulo: 'Caminho de vida', valor: n(num.pitagorica?.caminhoVida), detalhe: it.caminhoVida?.missao },
    { grupo: 'Numerologia', rotulo: 'Expressão', valor: n(num.pitagorica?.expressao), detalhe: it.expressao?.luz },
    { grupo: 'Numerologia', rotulo: 'Alma', valor: n(num.pitagorica?.alma), detalhe: it.alma?.luz },
    { grupo: 'Numerologia', rotulo: 'Personalidade', valor: n(num.pitagorica?.personalidade), detalhe: it.personalidade?.luz },
    { grupo: 'Numerologia', rotulo: 'Destino', valor: n(num.pitagorica?.destino), detalhe: it.destino?.missao },
    { grupo: 'Numerologia', rotulo: 'Ano pessoal', valor: n(num.ciclos?.anoPessoal) },
    { grupo: 'Cabala', rotulo: 'Anjo guardião', valor: n(typeof c.cabala?.cabala?.anjoGuardiao === 'string' ? c.cabala.cabala.anjoGuardiao.split(/[\n—:]/)[0].trim() : cab.guardianAngel?.name), detalhe: `arcanjo ${n(cab.rulingArchangel)} · coro ${n(cab.angelicChoir)}` },
    { grupo: 'Cabala', rotulo: 'Sephirah', valor: n(pick(seph, 'nome') ? `${seph.nome} (${seph.traducao})` : cab.sephirahName), detalhe: pick(seph, 'missao', 'luz') },
    { grupo: 'Odù', rotulo: 'Odù de nascimento', valor: n(pick(odu, 'nome')), detalhe: pick(odu, 'significado') },
    { grupo: 'Búzios', rotulo: 'Queda de nascimento', valor: n(pick(buz, 'nome') ? `${buz.queda ? `${buz.queda} — ` : ''}${buz.nome}` : ''), detalhe: pick(buz, 'significado') },
  ];

  const resumo = vozDoCigano([
    `DADOS NATAIS: ${dados.fullName} · nascimento ${dados.birthDate}${dados.birthTime ? ` às ${dados.birthTime}` : ' (hora não informada)'}`,
    `ASTROLOGIA: signo ${astro.sunSign}, elemento ${astro.element}, modalidade ${astro.modality}, Lua natal ${astro.lunarPhase} (${astro.lunarPhaseDescription})${astro.hourKnown ? `, regente da hora ${astro.planetaryHourRuler}` : ''}. Conselho cósmico: ${astro.cosmicAdvice}`,
    `CABALA (anjo e sephirah por data): anjo guardião ${cab.guardianAngel?.name} (${cab.guardianAngel?.virtue}), coro ${cab.angelicChoir}, arcanjo ${cab.rulingArchangel}, sephirah ${cab.sephirahName}: ${cab.spiritualGuidance}`,
    ...['numerologia', 'astrologia', 'cabala', 'odu', 'buzios'].map((k) => soOsDados(c[k]?.resumoParaCigano)),
  ].filter(Boolean).join('\n\n'));

  return { dados, itens, resumo: resumo.slice(0, 24000) };
}

/** Comparação entre a pessoa e outra (amor, sociedade, parceria, curiosidade). */
export function compararDadosNatais(pessoa: DadosNatais, outra: DadosNatais, pergunta: string): string {
  let sinastria = '';
  try {
    const r: any = calculateLoveSynastry({ name1: pessoa.fullName, birthDate1: pessoa.birthDate, birthTime1: pessoa.birthTime, name2: outra.fullName, birthDate2: outra.birthDate, birthTime2: outra.birthTime });
    sinastria = [
      `Elementos: ${r.elementalDynamic?.element1} x ${r.elementalDynamic?.element2} — ${r.elementalDynamic?.description}`,
      `Numerologia: caminho ${r.numerologicalResonance?.lifePath1} x ${r.numerologicalResonance?.lifePath2}, ressonância ${r.numerologicalResonance?.resonanceScore} — ${r.numerologicalResonance?.relationshipVibration}. Lição kármica em comum: ${r.numerologicalResonance?.karmicLessonShared}`,
      `Cabala: ${r.cabalisticAlignment?.sefira1} x ${r.cabalisticAlignment?.sefira2} — ${r.cabalisticAlignment?.pillarDynamic}; vínculo ${r.cabalisticAlignment?.spiritualBondLevel}`,
      r.qualitativeIndicators ? `Indicadores: ${JSON.stringify(r.qualitativeIndicators).slice(0, 900)}` : '',
    ].filter(Boolean).join('\n');
  } catch (e: any) {
    sinastria = `(sinastria indisponível: ${String(e?.message || e).slice(0, 80)})`;
  }
  const oculto = gerarComparacaoAmorosaSuprema({
    nomeConsulente: pessoa.fullName,
    nascimentoConsulente: pessoa.birthDate,
    nomeOutraPessoa: outra.fullName,
    nascimentoOutraPessoa: outra.birthDate,
    pergunta,
  });
  const mapaOutra = montarMapaNatal(outra);
  return vozDoCigano([
    `COMPARAÇÃO DOS DADOS NATAIS — ${pessoa.fullName} x ${outra.fullName}`,
    sinastria,
    soOsDados(oculto),
    `MAPA DA OUTRA PESSOA:\n${mapaOutra.itens.map((i) => `${i.rotulo}: ${i.valor}`).join(' | ')}`,
  ].join('\n\n')).slice(0, 12000);
}
