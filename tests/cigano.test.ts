import { describe, it, expect, vi, beforeEach } from 'vitest';

const gem = vi.hoisted(() => ({ prompts: [] as string[], text: 'Agradeço a confiança. As cartas mostram caminho aberto.\n<<<CIGANO>>>\n{"emotion":"serio","actions":[{"name":"fazer_cruz"},{"name":"apagar_tudo"}]}' }));
vi.mock('../serverlib/services/geminiService.js', () => ({
  MODEL_CHAIN: ['modelo-teste'],
  getGeminiClient: () => ({
    models: {
      generateContentStream: async (req: any) => {
        gem.prompts.push(String(req?.config?.systemInstruction || ''));
        async function* g() { yield { text: gem.text.slice(0, 20) }; yield { text: gem.text.slice(20) }; }
        return g();
      },
    },
  }),
}));

import handler from '../api/cigano.js';
import { BARALHO_CIGANO, embaralharBaralho, comInterpretacoesDoDono } from '../src/cigano/baralho.js';
import { montarAbertura, montarCruz, tirarCartas, descreverSete, CRUZ_POSICOES, CRUZ_LAYOUT, MAX_PERGUNTAS } from '../src/cigano/metodo.js';
import { cartasDoMonte, textoDaConsulta, textoDoBloco, textoDoMapa, tituloDoBloco } from '../src/cigano/copiar.js';
import { PERGUNTAS_PRONTAS } from '../src/cigano/perguntas.js';
import { buildFrocSpeechPrompt } from '../serverlib/services/ciganoSpeech.js';
import { limparDadosNatais, montarMapaNatal, compararDadosNatais } from '../src/cigano/natal.js';
import { aberturaDaMesa, promptDoCigano, separarResposta, sanitizarAcoes, saudacaoDoHorario, CIGANO_MARK } from '../src/cigano/persona.js';
import { detectarIntencao, envolveOutraPessoa, mandouParar } from '../src/cigano/intents.js';

function call(op: string, opts: { method?: string; body?: any; query?: any; token?: string } = {}) {
  const req: any = {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    query: { op, ...(opts.query || {}) },
    body: opts.body || {},
    headers: { authorization: `Bearer ${opts.token ?? 'test_token_admin_cigano'}` },
    socket: { remoteAddress: '127.0.0.1' },
  };
  const out = { status: 200, data: null as any, text: '', headers: {} as Record<string, string> };
  const res: any = {
    headersSent: false,
    status(c: number) { out.status = c; return res; },
    json(d: any) { out.data = d; res.headersSent = true; return res; },
    setHeader(k: string, v: string) { out.headers[k] = v; },
    flushHeaders() { res.headersSent = true; },
    write(chunk: any) { out.text += String(chunk); res.headersSent = true; return true; },
    end() { res.headersSent = true; },
  };
  return Promise.resolve(handler(req, res)).then(() => out);
}

const PESSOA = { fullName: 'Maria das Graças Souza', birthDate: '1979-03-21', birthTime: '06:15' };

beforeEach(() => { gem.prompts.length = 0; });

describe('Baralho do Cigano: Tarô de Thoth (Crowley)', () => {
  it('tem as 78 cartas com os nomes do Thoth, a imagem do dono e as traduções da Maria Padilha', () => {
    expect(BARALHO_CIGANO).toHaveLength(78);
    expect(new Set(BARALHO_CIGANO.map((c) => c.id)).size).toBe(78);
    expect(BARALHO_CIGANO.filter((c) => c.arcano === 'maior')).toHaveLength(22);
    const nomes = BARALHO_CIGANO.map((c) => c.nome);
    for (const n of ['O Louco', 'Luxúria', 'Arte', 'Ajustamento', 'O Aeon', 'O Universo', 'Domínio (Dois de Paus)', 'Poder (Quatro de Discos)', 'Princesa de Copas', 'Cavaleiro de Espadas']) expect(nomes).toContain(n);
    expect(nomes.some((n) => /Pajem|Valete/.test(n))).toBe(false);
    expect(BARALHO_CIGANO.find((c) => c.nome === 'Luxúria')?.tradicional).toBe('A Força');
    expect(BARALHO_CIGANO.find((c) => c.nome === 'Cavaleiro de Espadas')?.tradicional).toBe('Rei de Espadas');
    expect(BARALHO_CIGANO.every((c) => /^\/cartas\/[a-z0-9_]+\.webp$/.test(c.imagem || ''))).toBe(true);
    expect(BARALHO_CIGANO.every((c) => c.traducao && c.luz && c.sombra && c.conselho && c.alerta)).toBe(true);
    expect(BARALHO_CIGANO.filter((c) => c.arcano === 'maior').every((c) => c.entidade)).toBe(true);
  });

  it('a carta 0 é O Louco, com a tradução completa', () => {
    const louco = BARALHO_CIGANO.find((c) => c.numero === 0 && c.arcano === 'maior')!;
    expect(louco.nome).toBe('O Louco');
    expect(louco.romano).toBe('0');
    expect(louco.significado).toMatch(/Aleph/);
    expect(louco.significado).toMatch(/No amor/);
    expect(louco.traducao!.length).toBeGreaterThan(150);
    expect(louco.ensinamento).toMatch(/zero/);
  });

  it('embaralha de verdade: cada embaralhada sai diferente e sem repetir carta', () => {
    const a = embaralharBaralho().map((c) => c.id).join(',');
    const b = embaralharBaralho().map((c) => c.id).join(',');
    expect(a).not.toBe(b);
    expect(new Set(a.split(',')).size).toBe(78);
  });

  it('a leitura pessoal do dono tem prioridade', () => {
    const [c] = comInterpretacoesDoDono([BARALHO_CIGANO[0]], { [BARALHO_CIGANO[0].id]: { minhaLeitura: 'Para mim o Louco é viagem.', luz: '' } });
    expect(c.minhaLeitura).toBe('Para mim o Louco é viagem.');
    expect(c.luz).toBe(BARALHO_CIGANO[0].luz);
  });
});

describe('Método do Cigano', () => {
  it('7 cartas: 1-2-3, 4-5-6 e a 7ª coringa', () => {
    const sete = tirarCartas(embaralharBaralho(), 7);
    const txt = descreverSete(sete);
    expect(txt).toMatch(/CARTAS 1 · 2 · 3 — PRIMEIRA RESPOSTA/);
    expect(txt).toMatch(/CARTAS 4 · 5 · 6 — SEGUNDA RESPOSTA/);
    expect(txt).toMatch(/CARTA 7 — CORINGA DE CONFIRMAÇÃO/);
  });

  it('abertura: 3 montes de 7 (21 cartas sem repetir), cada um lido 3 + 3 + coringa', () => {
    const montes = montarAbertura(embaralharBaralho());
    expect(montes).toHaveLength(3);
    expect(montes.map((m) => m.posicao)).toEqual([1, 2, 3]);
    expect(montes.every((m) => m.cartas.length === 7)).toBe(true);
    expect(new Set(montes.flatMap((m) => m.cartas.map((c) => c.id))).size).toBe(21);
    expect(cartasDoMonte(montes[0].cartas)).toMatch(/^1ª resposta: 1\. .+\n2ª resposta: 4\. .+\nCoringa: 7\. /);
  });

  it('cruz: 5 montes de 7, sem repetir carta, na posição certa da mesa', () => {
    const montes = montarCruz(embaralharBaralho());
    expect(montes.map((m) => m.nome)).toEqual(['Realidade atual', 'Ameaça dos pés', 'Presente negativo', 'Futuro positivo', 'Ori — cabeça e pensamentos']);
    expect(montes.every((m) => m.cartas.length === 7)).toBe(true);
    expect(new Set(montes.flatMap((m) => m.cartas.map((c) => c.id))).size).toBe(35);
    expect(CRUZ_LAYOUT[1]).toEqual({ linha: 1, coluna: 2 });
    expect(CRUZ_LAYOUT[2]).toEqual({ linha: 3, coluna: 2 });
    expect([CRUZ_LAYOUT[4].coluna, CRUZ_LAYOUT[5].coluna, CRUZ_LAYOUT[3].coluna]).toEqual([1, 2, 3]);
    expect(CRUZ_POSICOES).toHaveLength(5);
  });
});

describe('Mapa natal com todos os oráculos', () => {
  it('valida os dados natais', () => {
    expect(limparDadosNatais({ fullName: 'Ana', birthDate: '2099-01-01' })).toBeNull();
    expect(limparDadosNatais({ fullName: 'Ana', birthDate: '1990-02-30' })).toBeNull();
    expect(limparDadosNatais({ fullName: 'Ana Lima', birthDate: '1990-02-10', birthTime: '25:00' })).toEqual({ fullName: 'Ana Lima', birthDate: '1990-02-10', birthTime: null });
  });

  it('retrato natal completo (essência, alma, amor e dinheiro, forças, momento, sorte) — e fala como Cigano', () => {
    const m = montarMapaNatal(limparDadosNatais(PESSOA)!);
    const grupos = new Set(m.itens.map((i) => i.grupo));
    for (const g of ['Essência', 'Alma e caminho', 'Amor e dinheiro', 'Forças espirituais', 'Momento atual', 'Sorte e proteção']) expect(grupos.has(g as any)).toBe(true);
    expect(m.itens.length).toBeGreaterThanOrEqual(25);
    expect(m.itens.find((i) => i.rotulo === 'Signo solar')?.valor).toBe('Áries');
    expect(m.itens.every((i) => i.valor && i.valor !== '—')).toBe(true);
    // orixás regentes, sem repetir o mesmo nome com outro acento
    const orixas = m.itens.find((i) => i.rotulo === 'Orixás que regem')!.valor.split(', ');
    expect(orixas.length).toBeGreaterThan(1);
    expect(orixas.filter((o) => /obatal|obàtál/i.test(o))).toHaveLength(1);
    expect(m.itens.find((i) => i.rotulo === 'Mês pessoal')?.detalhe).toMatch(/^mês de /);
    expect(m.itens.filter((i) => i.sombra).length).toBeGreaterThan(8);
    expect(m.resumo).toMatch(/ORIXÁS QUE REGEM/);
    expect(m.resumo).toMatch(/MOMENTO ATUAL: ano pessoal/);
    expect(m.resumo).toMatch(/NUMEROLOGIA/);
    expect(m.resumo).not.toMatch(/padilha|pombo ?gira|rainha das 7/i);
    expect(JSON.stringify(m.itens)).not.toMatch(/padilha|pombo ?gira/i);
    expect(m.resumo).not.toMatch(/Você é (?!o Cigano)/);
  });

  it('compara os dados natais de duas pessoas', () => {
    const txt = compararDadosNatais(limparDadosNatais(PESSOA)!, limparDadosNatais({ fullName: 'José Pereira', birthDate: '1975-11-02' })!, 'ele vai voltar?');
    expect(txt).toMatch(/José Pereira/);
    expect(txt).toMatch(/Compatibilidade/);
    expect(txt).not.toMatch(/Maria Padilha deve|Você é Maria Padilha/i);
  });
});

describe('Persona e comandos', () => {
  it('abre a mesa com a saudação, a oração e o nome três vezes', () => {
    const a = aberturaDaMesa('Maria das Graças');
    expect(a[0]).toBe('Salve a magia, salve a bruxaria, salve a feitiçaria.');
    expect(a.join(' ')).toMatch(/Salve a mesa cigana, salve o Cigano Pablo/);
    expect(a.join(' ')).toMatch(/Pelo poder da tradição/);
    expect(a.filter((x) => x === 'Quem quer saber a verdade é Maria das Graças.')).toHaveLength(3);
  });

  it('o Cigano conhece o método, a hora exata e o limite de 5 perguntas', () => {
    const p = promptDoCigano({ nowMs: Date.UTC(2026, 10, 5, 15, 0), nomeDono: 'Carlos', consulta: 'X', perguntasUsadas: 2, etapa: { tipo: 'monte', posicao: 3 } });
    expect(p).toMatch(/HOMEM/);
    expect(p).toMatch(/Tarô de Thoth de Aleister Crowley \(78 cartas\)/);
    expect(p).toMatch(/nunca vi nada tão certeiro/);
    expect(p).toMatch(/1-2-3 juntas/);
    expect(p).toMatch(/CORINGA/);
    expect(p).toMatch(/Já foram usadas 2 de 5/);
    expect(p).toMatch(/MONTE 3 DA CRUZ/);
    expect(p).toMatch(/3 montes de 7 cartas/);
    expect(p).toMatch(/dinâmico/);
    expect(p).toMatch(/AGRAVANTES/);
    expect(promptDoCigano({ nowMs: 0, etapa: { tipo: 'abertura', posicao: 2 } })).toMatch(/MONTE 2 DE 3 DO JOGO DE ABERTURA/);
    expect(promptDoCigano({ nowMs: 0, etapa: { tipo: 'apresentacao' } })).toMatch(/APRESENTAÇÃO — o retrato/);
    expect(buildFrocSpeechPrompt('Olá.')).toMatch(/Ritmo ágil e dinâmico/);
    expect(p).toMatch(/05 de novembro de 2026/);
    expect(p).toMatch(/pedir_dados_outra_pessoa/);
    expect(saudacaoDoHorario(Date.UTC(2026, 10, 5, 13, 0))).toBe('bom dia');
    expect(saudacaoDoHorario(Date.UTC(2026, 10, 5, 23, 0))).toBe('boa noite');
  });

  it('separa fala e ações; só passam ações conhecidas', () => {
    const r = separarResposta(`Vamos à cruz.\n${CIGANO_MARK}\n{"emotion":"firme","actions":[{"name":"fazer_cruz"},{"name":"hack"},{"name":"tirar_pergunta","pergunta":"vou mudar de emprego?"}]}`);
    expect(r.text).toBe('Vamos à cruz.');
    expect(r.emotion).toBe('firme');
    expect(r.actions).toEqual([{ name: 'fazer_cruz' }, { name: 'tirar_pergunta', pergunta: 'vou mudar de emprego?' }]);
    expect(sanitizarAcoes([{ name: 'open_page', page: 'admin' }])).toEqual([]);
  });

  it('comandos na hora e perguntas sobre outra pessoa', () => {
    const base = { temConsulta: true, temAbertura: false, temCruz: false };
    expect(detectarIntencao('pare', base)).toEqual({ kind: 'stop' });
    expect(detectarIntencao('abre a mesa', base)).toEqual({ kind: 'abrir_mesa' });
    expect(detectarIntencao('faz a cruz', { ...base, temAbertura: true })).toEqual({ kind: 'fazer_cruz' });
    expect(detectarIntencao('nova consulta', base)).toEqual({ kind: 'nova_consulta' });
    expect(detectarIntencao('apaga essa conversa', base)).toEqual({ kind: 'delete_chat' });
    expect(envolveOutraPessoa('Ele vai voltar para mim?')).toBe(true);
    expect(envolveOutraPessoa('A sociedade com o João vai dar certo?')).toBe(true);
    expect(envolveOutraPessoa('Vou passar no concurso?')).toBe(false);
    expect(mandouParar('para', 'as cartas mostram')).toBe(true);
  });
});

describe('/api/cigano (só o dono)', () => {
  it('bloqueia quem não é o dono', async () => {
    expect((await call('estado', { token: '' })).status).toBe(401);
    const r = await call('estado', { token: 'test_token_visitante1' });
    expect(r.status).toBe(403);
  });

  it('consulta completa: abertura (7), cruz (5x7), até 5 perguntas com comparação', async () => {
    const natal = await call('natal', { body: { dados: PESSOA } });
    expect(natal.status).toBe(200);
    expect(natal.data.itens.length).toBeGreaterThan(10);

    const aberta = await call('abrir', { body: { dados: PESSOA } });
    expect(aberta.status).toBe(201);
    const c = aberta.data.consulta;
    expect(c.id).toMatch(/^cg_[a-f0-9]{24}$/);
    expect(c.tiragens[0].tipo).toBe('abertura');
    expect(c.tiragens[0].montes).toHaveLength(3);
    expect(c.tiragens[0].montes.every((m: any) => m.cartas.length === 7)).toBe(true);
    expect(c.mapaResumo).toBeUndefined();

    const cruz = await call('cruz', { body: { consultaId: c.id } });
    const t = cruz.data.consulta.tiragens.find((x: any) => x.tipo === 'cruz');
    expect(t.montes).toHaveLength(5);
    // pedir a cruz de novo não embaralha outra vez
    const cruz2 = await call('cruz', { body: { consultaId: c.id } });
    expect(cruz2.data.consulta.tiragens.filter((x: any) => x.tipo === 'cruz')).toHaveLength(1);

    const p1 = await call('pergunta', { body: { consultaId: c.id, pergunta: 'Ele vai voltar?', outraPessoa: { fullName: 'José Pereira', birthDate: '1975-11-02' } } });
    expect(p1.status).toBe(200);
    expect(p1.data.indice).toBe(1);
    for (let i = 2; i <= MAX_PERGUNTAS; i++) expect((await call('pergunta', { body: { consultaId: c.id, pergunta: `Pergunta ${i}?` } })).status).toBe(200);
    const sexta = await call('pergunta', { body: { consultaId: c.id, pergunta: 'Mais uma?' } });
    expect(sexta.status).toBe(409);

    // O Cigano interpreta o que realmente saiu na mesa (cartas + mapa + comparação)
    const chat = await call('chat', { body: { consultaId: c.id, etapa: { tipo: 'pergunta', indice: 1 }, messages: [{ role: 'user', content: '[PERGUNTA 1] Ele vai voltar?' }] } });
    expect(chat.status).toBe(200);
    expect(chat.text).toMatch(/event: done/);
    const done = JSON.parse(chat.text.split('event: done\ndata: ')[1].split('\n')[0]);
    expect(done.text).toBe('Agradeço a confiança. As cartas mostram caminho aberto.');
    expect(done.actions).toEqual([{ name: 'fazer_cruz' }]);
    const prompt = gem.prompts[0];
    const primeira = c.tiragens[0].montes[2].cartas[6].nome;
    expect(prompt).toContain(primeira);
    expect(prompt).toMatch(/MONTE 3 DA ABERTURA/);
    expect(prompt).toMatch(/SIGNIFICADO DAS CARTAS QUE SAÍRAM \(Tarô de Thoth do Cigano\)/);
    expect(prompt).toMatch(/Tradução: /);
    expect(prompt).toMatch(/MONTE 5 — ORI/);
    expect(prompt).toMatch(/COMPARAÇÃO DOS DADOS NATAIS/);
    expect(prompt).toMatch(/Já foram usadas 5 de 5/);

    const lista = await call('consultas');
    expect(lista.data.consultas.some((x: any) => x.id === c.id)).toBe(true);
  });

  it('retrato antes de abrir a mesa: o Cigano recebe o mapa natal da pessoa', async () => {
    const r = await call('chat', { body: { etapa: { tipo: 'apresentacao' }, dados: PESSOA, messages: [{ role: 'user', content: '[RETRATO NATAL]' }] } });
    expect(r.status).toBe(200);
    expect(gem.prompts[0]).toMatch(/MAPA NATAL DE MARIA DAS GRAÇAS SOUZA \(ainda sem cartas\)/);
    expect(gem.prompts[0]).toMatch(/ORIXÁS QUE REGEM/);
    expect((await call('chat', { body: { etapa: { tipo: 'apresentacao' }, dados: { fullName: '' }, messages: [{ role: 'user', content: 'x' }] } })).status).toBe(400);
  });

  it('salva a interpretação do dono e usa nos próximos jogos', async () => {
    const id = BARALHO_CIGANO[1].id;
    const r = await call('cartas', { body: { id, luz: 'Começo de trabalho', sombra: 'Enganação', conselho: 'Use seus dons', minhaLeitura: 'O Mago é o próprio consulente agindo.' } });
    expect(r.status).toBe(200);
    const lista = await call('cartas');
    expect(lista.data.cartas.find((c: any) => c.id === id).minhaLeitura).toBe('O Mago é o próprio consulente agindo.');
    expect((await call('cartas', { body: { id: 'x', luz: 'a' } })).status).toBe(400);
  });

  it('recusa dados natais inválidos e consulta de outro dono', async () => {
    expect((await call('abrir', { body: { dados: { fullName: '', birthDate: 'x' } } })).status).toBe(400);
    expect((await call('cruz', { body: { consultaId: 'cg_000000000000000000000000' } })).status).toBe(404);
  });
});

describe('Copiar para mandar à pessoa', () => {
  const dados = { fullName: 'Maria das Graças Souza', birthDate: '1979-03-21', birthTime: '06:15' };
  it('bloco com marca, nome, data, título, cartas e assinatura', () => {
    const montes = montarAbertura(embaralharBaralho());
    const tiragens: any = [{ id: 't1', tipo: 'abertura', criadaEm: '', montes }];
    const b = tituloDoBloco({ tipo: 'abertura', posicao: 2 }, tiragens);
    expect(b.titulo).toBe('Jogo de abertura — segundo monte');
    const txt = textoDoBloco({ dados, ...b, fala: 'As cartas mostram caminho aberto.' });
    expect(txt).toMatch(/^🔮 MAGIA DO TAROT — o Reino Encantado das Cartas\nConsulta de Maria das Graças Souza · nascimento 21\/03\/1979 às 06:15/);
    expect(txt).toContain('✦ JOGO DE ABERTURA — SEGUNDO MONTE');
    expect(txt).toContain(montes[1].cartas[0].nome);
    expect(txt).toContain('As cartas mostram caminho aberto.');
    expect(txt).toMatch(/— Cigano · Magia do Tarot/);
    expect(txt).not.toMatch(/crenças|padilha/i);
  });
  it('retrato natal e consulta inteira', () => {
    const m = montarMapaNatal(limparDadosNatais(dados)!);
    const mapa = textoDoMapa(dados, m.itens);
    expect(mapa).toMatch(/Retrato natal de Maria/);
    expect(mapa).toMatch(/✦ FORÇAS ESPIRITUAIS/);
    expect(mapa).toMatch(/Cuidado: /);
    const tudo = textoDaConsulta(dados, [{ titulo: 'Seu retrato natal — quem você é', fala: 'A' }, { titulo: 'Pergunta 1: “X?”', cartas: '1ª resposta: 1. O Sol', fala: 'B' }]);
    expect(tudo).toMatch(/✦ SEU RETRATO NATAL[\s\S]+— — —[\s\S]+✦ PERGUNTA 1/);
  });
  it('perguntas prontas do nicho', () => {
    expect(PERGUNTAS_PRONTAS.length).toBeGreaterThanOrEqual(12);
    expect(PERGUNTAS_PRONTAS.map((p) => p.texto)).toContain('Corro algum risco, perigo ou demanda?');
    expect(PERGUNTAS_PRONTAS.some((p) => /orixá/.test(p.texto))).toBe(true);
    expect(envolveOutraPessoa('Como está minha vida amorosa?')).toBe(false);
  });
});
