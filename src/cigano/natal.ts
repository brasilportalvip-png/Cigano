/**
 * Mapa natal do Cigano: todos os oráculos calculados a partir de
 * nome completo, data e (se souber) hora de nascimento. Só do servidor.
 */
import { buildConsultaSuprema, gerarComparacaoAmorosaSuprema } from '../oraculos/index.js';
import { calculateLoveSynastry } from '../oraculos/loveSynastryEngine.js';
import { calculateAstrology } from '../oraculos/astrologyEngine.js';
import { calculateCabala } from '../oraculos/cabalaEngine.js';
import { interpretarNumero } from '../oraculos/numerologia-suprema.js';

export interface DadosNatais {
  fullName: string;
  /** AAAA-MM-DD */
  birthDate: string;
  /** HH:MM (opcional) */
  birthTime?: string | null;
}

export type GrupoMapa = 'Essência' | 'Alma e caminho' | 'Amor e dinheiro' | 'Forças espirituais' | 'Momento atual' | 'Sorte e proteção';

export interface ItemMapa {
  grupo: GrupoMapa;
  rotulo: string;
  valor: string;
  /** O lado de luz / o significado. */
  detalhe?: string;
  /** O lado de sombra (o que pede cuidado). */
  sombra?: string;
}

const ELEMENTO: Record<string, string> = {
  Fogo: 'Coragem, impulso e liderança; quando se fere, reage na hora e pode agir com pressa.',
  Terra: 'Segurança, trabalho e lealdade; constrói devagar, mas pode travar por teimosia e medo de mudar.',
  Ar: 'Mente rápida, comunicação e ideias; sofre com a cabeça cheia e com a indecisão.',
  Água: 'Emoção profunda e intuição forte; sente tudo e costuma guardar mágoa.',
};

/** O que cada ano pessoal traz (numerologia). */
export const ANO_PESSOAL: Record<number, string> = {
  1: 'ano de começo: plantar, iniciar projetos, tomar a frente e decidir por conta própria.',
  2: 'ano de parceria e paciência: acordos, amor, sensibilidade; nada de forçar.',
  3: 'ano de expansão: comunicação, convites, vida social, criatividade e visibilidade.',
  4: 'ano de trabalho e base: esforço, organização, dinheiro suado e estrutura.',
  5: 'ano de mudança: viagens, novidades, liberdade, reviravoltas e riscos.',
  6: 'ano de família e amor: casa, compromisso, responsabilidades e cobranças afetivas.',
  7: 'ano de recolhimento: espiritualidade, estudo, verdades reveladas e solidão necessária.',
  8: 'ano de colheita: dinheiro, poder, justiça, cobranças e conquistas materiais.',
  9: 'ano de encerramento: fim de ciclos, limpeza, desapego e preparação para o novo.',
  11: 'ano mestre de revelação: intuição forte, chamados espirituais e muita sensibilidade.',
  22: 'ano mestre de construção: grandes obras, responsabilidade e conquista duradoura.',
};

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

  const odu2 = c.odu?.odu?.complementar || {};
  const oduS = c.odu?.odu?.sombra || {};
  const buz2 = c.buzios?.buzios?.complementar || {};
  const buzA = c.buzios?.buzios?.alerta || {};
  const pit = num.pitagorica || {};
  const cic = num.ciclos || {};
  const hum = num.analiseHumana || {};
  const fav = num.favoraveis || {};
  const kar = num.karma || {};
  const vistos = new Set<string>();
  const orixas = [...(odu.orixas || []), ...(buz.orixas || [])].filter((o: string) => {
    const k = String(o).normalize('NFD').replace(/[\u0300-\u036f\u1ec0-\u1eff]/g, '').replace(/[^a-z]/gi, '').toLowerCase();
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).slice(0, 6);
  const numero = (rotulo: string, v: any, i?: any): ItemMapa => ({ grupo: 'Alma e caminho', rotulo, valor: n(v), detalhe: i?.luz ? `${i.luz} Missão: ${i.missao}` : undefined, sombra: i?.sombra });
  const ciclo = (v: any, tipo: 'ano' | 'mês' | 'dia' = 'ano') => {
    const k = Number(v);
    const t = ANO_PESSOAL[k] || (k ? interpretarNumero(k).luz : '');
    return tipo === 'ano' ? t : t.replace(/^ano/, tipo);
  };
  const anjo = typeof c.cabala?.cabala?.anjoGuardiao === 'string' ? c.cabala.cabala.anjoGuardiao.split(/[\n—:]/)[0].trim() : cab.guardianAngel?.name;

  const itens: ItemMapa[] = [
    { grupo: 'Essência', rotulo: 'Signo solar', valor: n(astro.sunSign), detalhe: `${astro.element} · ${astro.modality}. ${ELEMENTO[String(astro.element)] || ''}`.trim() },
    { grupo: 'Essência', rotulo: 'Lua do nascimento', valor: n(astro.lunarPhase), detalhe: astro.lunarPhaseDescription },
    { grupo: 'Essência', rotulo: 'Regente da hora', valor: astro.hourKnown ? n(astro.planetaryHourRuler) : 'hora não informada', detalhe: astro.hourKnown ? 'O planeta que governava a hora em que nasceu: marca o jeito de agir.' : undefined },
    { grupo: 'Essência', rotulo: 'Personalidade', valor: n(pit.personalidade), detalhe: it.personalidade?.luz, sombra: it.personalidade?.sombra },
    numero('Caminho de vida', pit.caminhoVida, it.caminhoVida),
    numero('Expressão (talento)', pit.expressao, it.expressao),
    numero('Alma (o que deseja por dentro)', pit.alma, it.alma),
    numero('Destino', pit.destino, it.destino),
    numero('Missão espiritual', c.numerologia?.cabalistico?.missaoEspiritual, it.missaoEspiritual),
    numero('Tendência oculta', c.numerologia?.cabalistico?.tendenciaOculta, it.tendenciaOculta),
    { grupo: 'Alma e caminho', rotulo: 'Lições kármicas', valor: (kar.licoesKarmicas || []).length ? kar.licoesKarmicas.join(', ') : 'nenhuma', detalhe: (kar.licoesKarmicas || []).length ? 'Números que faltam no nome: o que esta vida veio ensinar.' : 'O nome traz todas as vibrações.' },
    { grupo: 'Amor e dinheiro', rotulo: 'No amor', valor: it.alma?.numero ? `alma ${it.alma.numero}` : '—', detalhe: hum.potencialAmoroso },
    { grupo: 'Amor e dinheiro', rotulo: 'No dinheiro', valor: it.expressao?.numero ? `expressão ${it.expressao.numero}` : '—', detalhe: hum.potencialFinanceiro },
    { grupo: 'Amor e dinheiro', rotulo: 'O que sabota', valor: 'autossabotagem', detalhe: hum.autoSabotagem },
    { grupo: 'Forças espirituais', rotulo: 'Orixás que regem', valor: orixas.length ? orixas.join(', ') : '—', detalhe: 'As forças do odù e da queda de nascimento: é com elas que se pode contar.' },
    { grupo: 'Forças espirituais', rotulo: 'Odù de nascimento', valor: n(pick(odu, 'nome')), detalhe: [pick(odu, 'significado'), odu.conselho ? `Conselho: ${odu.conselho}` : ''].filter(Boolean).join(' '), sombra: odu.sombra },
    { grupo: 'Forças espirituais', rotulo: 'Odù que acompanha', valor: n(pick(odu2, 'nome')), detalhe: pick(odu2, 'significado'), sombra: odu2.alerta },
    { grupo: 'Forças espirituais', rotulo: 'Odù de prova', valor: n(pick(oduS, 'nome')), detalhe: pick(oduS, 'significado'), sombra: oduS.alerta },
    { grupo: 'Forças espirituais', rotulo: 'Queda dos búzios', valor: n(pick(buz, 'nome') ? `${buz.queda ? `${buz.queda} — ` : ''}${buz.nome}` : ''), detalhe: [pick(buz, 'significado'), buz.conselho ? `Conselho: ${buz.conselho}` : ''].filter(Boolean).join(' '), sombra: buz.sombra },
    { grupo: 'Forças espirituais', rotulo: 'Búzios de alerta', valor: n(pick(buzA, 'nome') ? `${buzA.queda ? `${buzA.queda} — ` : ''}${buzA.nome}` : ''), detalhe: buzA.conselho, sombra: buzA.sombra || buz2.sombra },
    { grupo: 'Forças espirituais', rotulo: 'Anjo guardião', valor: n(anjo), detalhe: 'O anjo que guarda o dia do nascimento: a proteção que caminha junto.' },
    { grupo: 'Forças espirituais', rotulo: 'Sephirah', valor: n(pick(seph, 'nome') ? `${seph.nome} (${seph.traducao})` : cab.sephirahName), detalhe: pick(seph, 'luz', 'missao'), sombra: seph.sombra },
    { grupo: 'Momento atual', rotulo: 'Ano pessoal', valor: n(cic.anoPessoal), detalhe: ciclo(cic.anoPessoal) },
    { grupo: 'Momento atual', rotulo: 'Mês pessoal', valor: n(cic.mesPessoal), detalhe: ciclo(cic.mesPessoal, 'mês') },
    { grupo: 'Momento atual', rotulo: 'Dia pessoal (hoje)', valor: n(cic.diaPessoal), detalhe: ciclo(cic.diaPessoal, 'dia') },
    { grupo: 'Sorte e proteção', rotulo: 'Cor', valor: n(fav.cor), detalhe: buz.cores?.length ? `também: ${buz.cores.join(', ')}` : undefined },
    { grupo: 'Sorte e proteção', rotulo: 'Dia de força', valor: n(fav.dia) },
    { grupo: 'Sorte e proteção', rotulo: 'Número', valor: n(fav.numero) },
    { grupo: 'Sorte e proteção', rotulo: 'Elemento', valor: n(fav.elemento) },
  ].map((i) => ({ ...i, detalhe: i.detalhe ? String(i.detalhe).trim() : undefined, sombra: i.sombra ? String(i.sombra).trim() : undefined } as ItemMapa));

  const resumo = vozDoCigano([
    `DADOS NATAIS: ${dados.fullName} · nascimento ${dados.birthDate}${dados.birthTime ? ` às ${dados.birthTime}` : ' (hora não informada)'}`,
    `ASTROLOGIA: signo ${astro.sunSign}, elemento ${astro.element}, modalidade ${astro.modality}, Lua natal ${astro.lunarPhase} (${astro.lunarPhaseDescription})${astro.hourKnown ? `, regente da hora ${astro.planetaryHourRuler}` : ''}. Conselho cósmico: ${astro.cosmicAdvice}`,
    `CABALA (anjo e sephirah por data): anjo guardião ${cab.guardianAngel?.name} (${cab.guardianAngel?.virtue}), coro ${cab.angelicChoir}, arcanjo ${cab.rulingArchangel}, sephirah ${cab.sephirahName}: ${cab.spiritualGuidance}`,
    `ORIXÁS QUE REGEM (odù e búzios de nascimento): ${orixas.join(', ') || '—'}`,
    `MOMENTO ATUAL: ano pessoal ${cic.anoPessoal} (${ciclo(cic.anoPessoal)}), mês pessoal ${cic.mesPessoal} (${ciclo(cic.mesPessoal, 'mês')}), dia pessoal ${cic.diaPessoal} (${ciclo(cic.diaPessoal, 'dia')})`,
    `AMOR: ${hum.potencialAmoroso || '—'} · DINHEIRO: ${hum.potencialFinanceiro || '—'} · AUTOSSABOTAGEM: ${hum.autoSabotagem || '—'}`,
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
