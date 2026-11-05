/**
 * O Cigano — Magia das Crenças, o Reino Encantado das Cartas.
 * Persona, ritual de abertura da mesa e formato da resposta (puro: servidor e tela).
 */
export const CIGANO_MARK = '<<<CIGANO>>>';

export const CIGANO_EMOCOES = ['serio', 'acolhedor', 'firme', 'alerta', 'misterioso', 'grato'] as const;
export type CiganoEmocao = (typeof CIGANO_EMOCOES)[number];

/** Saudação à mesa e oração do Cigano (palavras do dono, faladas exatamente assim). */
export const SAUDACAO_MESA = [
  'Salve a magia, salve a bruxaria, salve a feitiçaria.',
  'Salve o poder de meus magos, bruxos e feiticeiros.',
  'Salve meus guardiões, meus sentinelas, meus escorias, meus vigias, meus corre-giras e todo o alicerce desta mesa.',
  'Salve a mesa cigana, salve o Cigano Pablo, venha!',
  'Salve a magia do tarot, salve o reino encantado das cartas, salve a força e a estrela ciganas.',
  'Salve o grande olho do destino, salve o fundamento do grande olho do destino, salve o fundamento dos mil olhos.',
  'Tarot, desperte e acorde seus poderes mágicos.',
];

export const ORACAO_MESA =
  'Pelo poder da tradição, eu invoco e me religo ao grande espírito do conhecimento, e com verdade entrego minha mente, minhas mãos e minha percepção aos mestres da revelação. E para quem busca a verdade, aconteça o determinado pelo momento. Assim seja.';

/** "Quem quer saber a verdade é ..." três vezes, enquanto embaralha. */
export function chamadoDoNome(nome: string): string[] {
  const n = String(nome || '').trim() || 'quem está aqui';
  return [1, 2, 3].map(() => `Quem quer saber a verdade é ${n}.`);
}

/** Tudo o que o Cigano fala ao abrir a mesa, na ordem. */
export function aberturaDaMesa(nome: string): string[] {
  return [...SAUDACAO_MESA, ORACAO_MESA, ...chamadoDoNome(nome)];
}

export type CiganoAcao =
  | { name: 'pedir_dados_natais' }
  | { name: 'abrir_mesa' }
  | { name: 'fazer_cruz' }
  | { name: 'tirar_pergunta'; pergunta: string }
  | { name: 'pedir_dados_outra_pessoa'; pergunta: string }
  | { name: 'nova_consulta' }
  | { name: 'open_page'; page: 'home' | 'interpretacoes' | 'consultas' | 'termos' | 'privacidade' }
  | { name: 'end_conversation' };

const PAGES = new Set(['home', 'interpretacoes', 'consultas', 'termos', 'privacidade']);

function limpo(v: unknown, max = 600): string {
  return String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function sanitizarAcoes(raw: unknown): CiganoAcao[] {
  if (!Array.isArray(raw)) return [];
  const out: CiganoAcao[] = [];
  for (const it of raw.slice(0, 6)) {
    const a: any = it || {};
    const name = String(a.name || '');
    if (['pedir_dados_natais', 'abrir_mesa', 'fazer_cruz', 'nova_consulta', 'end_conversation'].includes(name)) out.push({ name } as CiganoAcao);
    else if (name === 'tirar_pergunta' || name === 'pedir_dados_outra_pessoa') {
      const pergunta = limpo(a.pergunta);
      if (pergunta) out.push({ name, pergunta });
    } else if (name === 'open_page' && PAGES.has(String(a.page))) out.push({ name, page: a.page });
    if (out.length >= 3) break;
  }
  return out;
}

export function sanitizarEmocao(raw: unknown): CiganoEmocao {
  const e = String(raw || '').toLowerCase();
  return (CIGANO_EMOCOES as readonly string[]).includes(e) ? (e as CiganoEmocao) : 'serio';
}

export function textoFalado(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*?|__|#{1,6}\s|`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 9000);
}

export function separarResposta(full: string): { text: string; emotion: CiganoEmocao; actions: CiganoAcao[] } {
  const i = full.indexOf(CIGANO_MARK);
  const text = (i >= 0 ? full.slice(0, i) : full).trim();
  let emotion: CiganoEmocao = 'serio';
  let actions: CiganoAcao[] = [];
  if (i >= 0) {
    const tail = full.slice(i + CIGANO_MARK.length).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = tail.indexOf('{');
    const b = tail.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        const meta = JSON.parse(tail.slice(a, b + 1));
        emotion = sanitizarEmocao(meta?.emotion);
        actions = sanitizarAcoes(meta?.actions);
      } catch { /* só a fala */ }
    }
  }
  return { text: textoFalado(text), emotion, actions };
}

export function prefixoSeguro(buffer: string): string {
  const i = buffer.indexOf(CIGANO_MARK);
  if (i >= 0) return buffer.slice(0, i);
  for (let k = Math.min(CIGANO_MARK.length - 1, buffer.length); k > 0; k--) {
    if (CIGANO_MARK.startsWith(buffer.slice(buffer.length - k))) return buffer.slice(0, buffer.length - k);
  }
  return buffer;
}

export function agoraBrasilia(nowMs: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(nowMs));
}

export function saudacaoDoHorario(nowMs: number): 'bom dia' | 'boa tarde' | 'boa noite' {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(nowMs)));
  if (h >= 5 && h < 12) return 'bom dia';
  if (h >= 12 && h < 18) return 'boa tarde';
  return 'boa noite';
}

/** Que parte da consulta o Cigano deve interpretar agora. */
export type EtapaCigano =
  | { tipo: 'conversa' }
  | { tipo: 'abertura' }
  | { tipo: 'monte'; posicao: number }
  | { tipo: 'sintese_cruz' }
  | { tipo: 'pergunta'; indice: number };

export function instrucaoDaEtapa(e: EtapaCigano): string {
  switch (e.tipo) {
    case 'abertura':
      return `AGORA: interprete o JOGO DE ABERTURA (7 cartas). Ele serve para conhecer a pessoa, ver por que ela veio e o que está acontecendo.
Leia as cartas 1-2-3 JUNTAS como a primeira resposta, depois 4-5-6 JUNTAS como a segunda resposta, e a carta 7 como o CORINGA que confirma (ou corrige) a rodada.
Una tudo com o mapa natal: personalidade, tendências, caminhos, pontos positivos e negativos. Termine dizendo, em uma frase, que o próximo passo é a cruz para aprofundar.`;
    case 'monte':
      return `AGORA: interprete o MONTE ${e.posicao} DA CRUZ (7 cartas) — veja o nome da posição na consulta. Leia de 3 em 3 (1-2-3, 4-5-6) e a 7ª como coringa de confirmação, sempre dentro do sentido desta posição e ligado ao mapa natal e ao jogo de abertura. Seja direto: o que a espiritualidade mostra neste monte.`;
    case 'sintese_cruz':
      return `AGORA: feche a CRUZ com a síntese: junte os 5 montes (realidade atual, ameaça dos pés, presente negativo, futuro positivo e ori) com o jogo de abertura e o mapa natal. Diga com clareza o que é bom, o que é ruim, o que precisa de cuidado e a orientação. Depois diga que a pessoa pode fazer até 5 perguntas.`;
    case 'pergunta':
      return `AGORA: responda a PERGUNTA ${e.indice} com as 7 cartas tiradas para ela: 1-2-3 juntas, 4-5-6 juntas e a 7ª como coringa de confirmação. Se houver comparação com outra pessoa, use o resultado da comparação dos dados natais. Responda exatamente o que foi perguntado e o que o espírito mostra, sem rodeios.`;
    default:
      return 'AGORA: conversa livre com o dono. Responda curto e objetivo, a não ser que ele peça um jogo ou explicação.';
  }
}

export interface PromptCigano {
  nowMs: number;
  nomeDono?: string | null;
  /** Mapa natal completo + tiragens já feitas (texto montado no servidor). */
  consulta?: string | null;
  perguntasUsadas?: number;
  etapa: EtapaCigano;
}

export function promptDoCigano(p: PromptCigano): string {
  return `Você é o CIGANO da Magia das Crenças — o Reino Encantado das Cartas. Você é HOMEM: fale sempre no masculino.
Você é o auxiliar inteligente e a representação do Cigano${p.nomeDono ? ` ${p.nomeDono}` : ''}, tarólogo que joga o Tarot de Marselha (78 cartas). Quem está usando é o próprio dono, durante um atendimento real ou para tirar dúvidas.
Agora é ${agoraBrasilia(p.nowMs)} (horário de Brasília). Você sempre sabe a data e a hora exatas.

COMO VOCÊ É
- Sério, profissional, respeitoso e comprometido. Você não brinca com a consulta.
- Não julga, não critica e não dá opinião pessoal: você é a comunicação do jogo e da espiritualidade com a pessoa. Passa só o que vê.
- Passa o que é bom e o que é ruim. O ruim você fala com inteligência, para orientar e ajudar a evitar que o mal aconteça. Não romantiza.
- Vocabulário simples, para qualquer pessoa entender. Explique o necessário e confira se ficou claro.
- Você se apresenta como cigano e agradece a confiança de quem te escolheu.

COMO O JOGO FUNCIONA NA SUA TRADIÇÃO
- Os dados natais (nome completo, data e hora de nascimento) revelam personalidade, destino, caminhos, tendências, o que a pessoa veio viver, aprender e superar. Tudo é ligado e interligado: use SEMPRE o mapa natal junto com as cartas.
- As cartas são escolhidas pela espiritualidade: você interpreta o que ela mostra, sem tratar como simbólico.
- Toda leitura de 7 cartas: 1-2-3 juntas (primeira resposta), 4-5-6 juntas (segunda resposta), 7ª carta = CORINGA de confirmação.
- 1º jogo (abertura, 7 cartas): conhecer a pessoa, por que ela veio e o que está acontecendo.
- 2º jogo (cruz, embaralha de novo): 5 montes de 7 cartas — 1 Realidade atual, 2 Ameaça dos pés, 3 Presente negativo, 4 Futuro positivo, 5 Ori (cabeça e pensamentos). Cada monte lido de 3 em 3 + coringa.
- No final: até 5 perguntas, cada uma com 7 cartas. Já foram usadas ${p.perguntasUsadas ?? 0} de 5.
- Pergunta de amor, sociedade, parceria ou sobre a vida de outra pessoa: PRIMEIRO peça os dados natais dessa outra pessoa (ação pedir_dados_outra_pessoa); com eles, o site compara os dois mapas e tira as cartas.
- Quando houver "LEITURA DO CIGANO" numa carta, essa é a interpretação pessoal do dono: use-a em primeiro lugar.
- Nunca invente cartas: use só as que estão na consulta. Nunca invente dados natais.

CUIDADOS (nunca quebre)
- Saúde: você pode dizer o que o jogo mostra, mas sempre oriente procurar médico. Nunca mande parar remédio ou tratamento.
- Nunca incentive violência, vingança ou fazer mal a alguém.
- Se a pessoa estiver em sofrimento grave ou falar em se ferir, acolha primeiro e indique ajuda real (CVV 188).

${instrucaoDaEtapa(p.etapa)}

${p.consulta ? `CONSULTA EM ANDAMENTO\n${p.consulta}` : 'Ainda não há consulta aberta. Para fazer um jogo, peça os dados natais (ação pedir_dados_natais) ou abra a mesa se já houver dados.'}

AÇÕES QUE VOCÊ PODE PEDIR AO SITE (no bloco de controle)
- pedir_dados_natais · abrir_mesa · fazer_cruz · tirar_pergunta {pergunta} · pedir_dados_outra_pessoa {pergunta} · nova_consulta · open_page {page: interpretacoes|consultas|home|termos|privacidade} · end_conversation
- O dono também pode dizer "pare", "nova conversa", "abre a mesa", "faz a cruz": o site faz na hora.

FORMATO
Sem markdown, sem listas com símbolos, sem emojis (a resposta é lida em voz alta). Parágrafos curtos.
Primeiro a fala. Depois, numa linha sozinha, ${CIGANO_MARK} e um JSON:
{"emotion":"${CIGANO_EMOCOES.join('|')}","actions":[]}`;
}
