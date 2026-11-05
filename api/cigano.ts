import type { Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, type AuthenticatedRequest } from '../serverlib/middleware/auth.js';
import { firestore } from '../serverlib/_firebaseAdmin.js';
import { checkRateLimit } from '../serverlib/services/rateLimiter.js';
import { getGeminiClient, MODEL_CHAIN } from '../serverlib/services/geminiService.js';
import { cleanSpeechText, createLiveTranscriptionToken, FROC_SPEECH_SAMPLE_RATE, synthesizeFrocSpeechStream } from '../serverlib/services/ciganoSpeech.js';
import { BARALHO_MARSELHA, comInterpretacoesDoDono, embaralharMarselha } from '../src/cigano/baralho.js';
import { CARTAS_POR_JOGO, MAX_PERGUNTAS, montarCruz, tirarCartas, type CartaCigano, type Tiragem } from '../src/cigano/metodo.js';
import { compararDadosNatais, limparDadosNatais, montarMapaNatal } from '../src/cigano/natal.js';
import { consultaParaTexto, perguntasUsadas, type ConsultaCigano } from '../src/cigano/consulta.js';
import { prefixoSeguro, promptDoCigano, separarResposta, type EtapaCigano } from '../src/cigano/persona.js';

/**
 * Magia das Crenças — o Reino Encantado das Cartas: tudo do Cigano numa função só.
 * Uso exclusivo do dono (admin do Firebase ou e-mail em CIGANO_DONO_EMAILS).
 *   GET  ?op=estado | ?op=consultas | ?op=consulta&id= | ?op=cartas
 *   POST ?op=natal | ?op=abrir | ?op=cruz | ?op=pergunta | ?op=chat (SSE) | ?op=fala | ?op=escuta | ?op=cartas
 */
export const CONSULTAS = 'cigano_consultas';
export const CARTAS_DONO = 'cigano_cartas';
const ID_RE = /^cg_[a-f0-9]{24}$/;

function donoEmails(): string[] {
  return String(process.env.CIGANO_DONO_EMAILS || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
}

/** Só o dono entra: admin verificado no servidor ou e-mail autorizado. */
async function exigirDono(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  const ok = await requireAuth(req, res);
  if (!ok) return false;
  const email = String(req.user?.email || '').toLowerCase();
  const dono = req.hasAdminClaim === true || req.user?.role === 'admin' || (!!email && donoEmails().includes(email));
  if (!dono) {
    res.status(403).json({ error: 'Acesso exclusivo do Cigano (dono).', code: 'DONO_REQUIRED' });
    return false;
  }
  return true;
}

async function interpretacoesDoDono(): Promise<Record<string, Partial<CartaCigano>>> {
  try {
    const snap = await firestore.collection(CARTAS_DONO).doc('interpretacoes').get();
    return (snap.exists ? snap.data()?.cartas : null) || {};
  } catch {
    return {};
  }
}

async function baralhoDoDono(): Promise<CartaCigano[]> {
  return comInterpretacoesDoDono(embaralharMarselha(), await interpretacoesDoDono());
}

function novaTiragem(tipo: Tiragem['tipo'], extra: Partial<Tiragem> = {}): Tiragem {
  return { id: `t_${crypto.randomBytes(6).toString('hex')}`, tipo, criadaEm: new Date().toISOString(), ...extra };
}

async function carregarConsulta(uid: string, id: string): Promise<ConsultaCigano | null> {
  if (!ID_RE.test(id)) return null;
  const snap = await firestore.collection(CONSULTAS).doc(id).get();
  const c = snap.exists ? (snap.data() as ConsultaCigano) : null;
  return c && c.donoUid === uid ? c : null;
}

async function salvarConsulta(c: ConsultaCigano): Promise<void> {
  c.atualizadaEm = new Date().toISOString();
  await firestore.collection(CONSULTAS).doc(c.id).set(JSON.parse(JSON.stringify(c)));
}

/** O que a tela recebe (sem o texto interno do mapa). */
function publica(c: ConsultaCigano) {
  const { mapaResumo, comparacoes, ...resto } = c;
  void mapaResumo; void comparacoes;
  return { ...resto, perguntasUsadas: perguntasUsadas(c), perguntasMax: MAX_PERGUNTAS };
}

function op(req: Request): string {
  return String((req.query as any)?.op || '').trim();
}

function sse(res: Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as any).flushHeaders?.();
  return (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function etapaValida(raw: any): EtapaCigano {
  const t = String(raw?.tipo || '');
  if (t === 'abertura' || t === 'sintese_cruz') return { tipo: t };
  if (t === 'monte') {
    const posicao = Math.round(Number(raw?.posicao));
    if (posicao >= 1 && posicao <= 5) return { tipo: 'monte', posicao };
  }
  if (t === 'pergunta') {
    const indice = Math.round(Number(raw?.indice));
    if (indice >= 1 && indice <= MAX_PERGUNTAS) return { tipo: 'pergunta', indice };
  }
  return { tipo: 'conversa' };
}

async function chat(req: AuthenticatedRequest, res: Response) {
  const uid = req.user!.uid;
  const msgs = Array.isArray(req.body?.messages) ? req.body.messages.slice(-20) : [];
  const valid = msgs.length && msgs.every((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string' && m.content.length <= 12000);
  if (!valid || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'Mensagem inválida.' });
  const etapa = etapaValida(req.body?.etapa);
  const consultaId = String(req.body?.consultaId || '');
  const consulta = consultaId ? await carregarConsulta(uid, consultaId) : null;
  if (consultaId && !consulta) return res.status(404).json({ error: 'Consulta não encontrada.' });
  const ai: any = getGeminiClient();
  if (!ai) return res.status(503).json({ error: 'O Cigano está sem conexão com a inteligência agora.' });

  const systemInstruction = promptDoCigano({
    nowMs: Date.now(),
    nomeDono: String(req.user?.fullName || '').split(' ')[0] || null,
    consulta: consulta ? consultaParaTexto(consulta) : null,
    perguntasUsadas: consulta ? perguntasUsadas(consulta) : 0,
    etapa,
  });
  const contents = msgs.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));
  const maxOutputTokens = etapa.tipo === 'conversa' ? 1200 : 3500;

  const send = sse(res);
  let buffer = '';
  let sent = 0;
  let model = '';
  for (const candidate of MODEL_CHAIN) {
    if (sent > 0) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const stream: any = await ai.models.generateContentStream({
        model: candidate,
        contents,
        config: { systemInstruction, temperature: 0.8, maxOutputTokens, abortSignal: controller.signal },
      });
      for await (const chunk of stream) {
        const piece = typeof chunk?.text === 'string' ? chunk.text : '';
        if (!piece) continue;
        buffer += piece;
        const safe = prefixoSeguro(buffer);
        if (safe.length > sent) { send('delta', { text: safe.slice(sent) }); sent = safe.length; }
      }
      model = candidate;
      clearTimeout(timer);
      break;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn('[Cigano] modelo falhou', candidate, String(err?.message || err).slice(0, 160));
    }
  }
  if (!buffer.trim()) { send('error', { error: 'A conexão caiu por um instante. Pede de novo?' }); return res.end(); }
  send('done', { ...separarResposta(buffer), model });
  res.end();
}

async function fala(res: Response, text: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!text) return res.status(400).json({ error: 'Texto vazio.' });
  if (!key) return res.status(503).json({ error: 'Voz indisponível.', code: 'tts_not_configured' });
  let started = false;
  try {
    for await (const audio of synthesizeFrocSpeechStream(key, text)) {
      if (!started) {
        res.status(200);
        res.setHeader('Content-Type', 'audio/l16');
        res.setHeader('X-Froc-Audio-Sample-Rate', String(FROC_SPEECH_SAMPLE_RATE));
        res.setHeader('Cache-Control', 'no-store');
        (res as any).flushHeaders?.();
        started = true;
      }
      res.write(audio);
    }
    res.end();
  } catch (err: any) {
    console.error('[Cigano] voz', err?.message);
    if (!started) return res.status(503).json({ error: 'Voz indisponível agora.', code: 'tts_unavailable' });
    res.end();
  }
}

export default async function handler(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const o = op(req);
  try {
    if (!(await exigirDono(req, res))) return;
    const uid = req.user!.uid;
    const limite = await checkRateLimit(`cigano:${uid}:${o}`, o === 'fala' ? 120 : 60, 60_000);
    if (!limite.allowed) return res.status(429).json({ error: 'Muitas ações em sequência. Aguarde alguns segundos.' });

    if (req.method === 'GET') {
      if (o === 'estado') return res.json({ dono: true, nome: req.user?.fullName || null });
      if (o === 'consultas') {
        const snap = await firestore.collection(CONSULTAS).where('donoUid', '==', uid).get();
        const lista = snap.docs.map((d: any) => d.data() as ConsultaCigano)
          .sort((a: ConsultaCigano, b: ConsultaCigano) => String(b.atualizadaEm).localeCompare(String(a.atualizadaEm)))
          .slice(0, 50)
          .map((c: ConsultaCigano) => ({ id: c.id, nome: c.dados.fullName, nascimento: c.dados.birthDate, atualizadaEm: c.atualizadaEm, tiragens: c.tiragens.map((t) => t.tipo), perguntasUsadas: perguntasUsadas(c) }));
        return res.json({ consultas: lista });
      }
      if (o === 'consulta') {
        const c = await carregarConsulta(uid, String((req.query as any)?.id || ''));
        return c ? res.json({ consulta: publica(c) }) : res.status(404).json({ error: 'Consulta não encontrada.' });
      }
      if (o === 'cartas') {
        const doDono = await interpretacoesDoDono();
        return res.json({ cartas: comInterpretacoesDoDono(BARALHO_MARSELHA, doDono), personalizadas: Object.keys(doDono).length });
      }
      return res.status(404).json({ error: 'Operação desconhecida.' });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    switch (o) {
      case 'natal': {
        const dados = limparDadosNatais(req.body?.dados);
        if (!dados) return res.status(400).json({ error: 'Confira nome completo e data de nascimento.' });
        const mapa = montarMapaNatal(dados);
        return res.json({ dados, itens: mapa.itens });
      }
      case 'abrir': {
        const dados = limparDadosNatais(req.body?.dados);
        if (!dados) return res.status(400).json({ error: 'Confira nome completo e data de nascimento.' });
        const mapa = montarMapaNatal(dados);
        const agora = new Date().toISOString();
        const c: ConsultaCigano = {
          id: `cg_${crypto.randomBytes(12).toString('hex')}`,
          donoUid: uid,
          criadaEm: agora,
          atualizadaEm: agora,
          dados,
          mapaResumo: mapa.resumo,
          mapaItens: mapa.itens,
          tiragens: [novaTiragem('abertura', { cartas: tirarCartas(await baralhoDoDono(), CARTAS_POR_JOGO) })],
        };
        await salvarConsulta(c);
        return res.status(201).json({ consulta: publica(c) });
      }
      case 'cruz': {
        const c = await carregarConsulta(uid, String(req.body?.consultaId || ''));
        if (!c) return res.status(404).json({ error: 'Consulta não encontrada.' });
        if (!c.tiragens.some((t) => t.tipo === 'abertura')) return res.status(409).json({ error: 'Abra a mesa (jogo de abertura) antes da cruz.' });
        if (!c.tiragens.some((t) => t.tipo === 'cruz')) {
          c.tiragens.push(novaTiragem('cruz', { montes: montarCruz(await baralhoDoDono()) }));
          await salvarConsulta(c);
        }
        return res.json({ consulta: publica(c) });
      }
      case 'pergunta': {
        const c = await carregarConsulta(uid, String(req.body?.consultaId || ''));
        if (!c) return res.status(404).json({ error: 'Consulta não encontrada.' });
        const pergunta = String(req.body?.pergunta || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 600);
        if (!pergunta) return res.status(400).json({ error: 'Escreva a pergunta.' });
        if (perguntasUsadas(c) >= MAX_PERGUNTAS) return res.status(409).json({ error: `As ${MAX_PERGUNTAS} perguntas desta consulta já foram feitas.`, code: 'LIMITE_PERGUNTAS' });
        const outra = req.body?.outraPessoa ? limparDadosNatais(req.body.outraPessoa) : null;
        if (req.body?.outraPessoa && !outra) return res.status(400).json({ error: 'Confira os dados natais da outra pessoa.' });
        const t = novaTiragem('pergunta', { pergunta, outraPessoa: outra, cartas: tirarCartas(await baralhoDoDono(), CARTAS_POR_JOGO) });
        c.tiragens.push(t);
        if (outra) c.comparacoes = { ...(c.comparacoes || {}), [t.id]: compararDadosNatais(c.dados, outra, pergunta) };
        await salvarConsulta(c);
        return res.json({ consulta: publica(c), tiragemId: t.id, indice: perguntasUsadas(c) });
      }
      case 'chat':
        return chat(req, res);
      case 'fala':
        return fala(res, cleanSpeechText(String(req.body?.text || '')));
      case 'escuta': {
        const key = process.env.GEMINI_API_KEY?.trim();
        if (!key) return res.status(503).json({ error: 'Escuta em tempo real indisponível.' });
        return res.json(await createLiveTranscriptionToken(key));
      }
      case 'cartas': {
        const id = String(req.body?.id || '');
        if (!BARALHO_MARSELHA.some((c) => c.id === id)) return res.status(400).json({ error: 'Carta inválida.' });
        const campo = (v: any) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, 2000);
        const atual = await interpretacoesDoDono();
        atual[id] = { luz: campo(req.body?.luz), sombra: campo(req.body?.sombra), conselho: campo(req.body?.conselho), minhaLeitura: campo(req.body?.minhaLeitura) };
        await firestore.collection(CARTAS_DONO).doc('interpretacoes').set({ cartas: atual, atualizadaEm: new Date().toISOString() });
        return res.json({ ok: true, carta: comInterpretacoesDoDono(BARALHO_MARSELHA.filter((c) => c.id === id), atual)[0] });
      }
    }
    return res.status(404).json({ error: 'Operação desconhecida.' });
  } catch (err: any) {
    console.error('[Cigano]', o, String(err?.message || err).slice(0, 300));
    if (!res.headersSent) return res.status(500).json({ error: 'O Cigano teve um problema agora. Tente de novo.' });
    res.end();
  }
}
