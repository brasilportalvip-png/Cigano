import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Mic, MicOff, Send, Volume2, VolumeX, Plus, Trash2, MessageSquare, LogOut, BookOpen, History, Sparkles, Loader2, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext.js';
import { cigano, ciganoChat, CiganoApiError, getToken, type ConsultaPublica, type DadosNatais, type ChatTurn, type ItemMapa } from '../cigano/client/api.js';
import { prepararFala, speakFrocBrowser, speakFrocNeural, type FalaPronta, type SpeakHandle } from '../cigano/client/speaker.js';
import { startFrocListener, mergeFinal, type FrocListener } from '../cigano/client/listener.js';
import { takeSentences } from '../cigano/client/text.js';
import { listChats, saveChat, deleteChat, newChatId, formatChatDate, type SavedChat } from '../cigano/client/history.js';
import { aberturaDaMesa, agoraBrasilia, chamadoDoNome, saudacaoDoHorario, type CiganoAcao, type CiganoEmocao, type EtapaCigano } from '../cigano/persona.js';
import { MAX_PERGUNTAS, type CartaCigano, type Tiragem } from '../cigano/metodo.js';
import { detectarIntencao, envolveOutraPessoa, mandouParar, normalizar, pareceEco } from '../cigano/intents.js';
import { BotaoCopiar, DetalheCarta, MapaNatalPainel, MesaTiragem, TextoComRotulos } from '../components/cigano/Mesa.js';
import { textoDaConsulta, textoDoBloco, tituloDoBloco } from '../cigano/copiar.js';
import { PERGUNTAS_PRONTAS } from '../cigano/perguntas.js';
import { useInstalarApp } from '../cigano/client/instalar.js';

type Fase = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  hidden?: boolean;
  streaming?: boolean;
  tiragemId?: string;
  animar?: boolean;
  ritual?: boolean;
  /** Que parte da consulta este bloco do Cigano interpretou (para o título ao copiar). */
  etapa?: EtapaCigano;
}

interface ItemFala { text: string; pronta?: FalaPronta }
/** Junta frases curtas num pedaço só: menos pausas entre uma frase e outra. */
const JUNTAR_ATE = 320;
const VOZ_KEY = 'cigano_voz';
function vozSalva(): boolean {
  try { return localStorage.getItem(VOZ_KEY) !== 'off'; } catch { return true; }
}

let seq = 0;
const mid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;
const FASE_LABEL: Record<Fase, string> = { idle: 'à disposição', listening: 'ouvindo', thinking: 'consultando as cartas…', speaking: 'falando' };
const DEBOUNCE_MS = 900;

function Avatar({ fase, level, size, onClick }: { fase: Fase; level: number; size: number; onClick?: () => void }) {
  const cor = fase === 'listening' ? '#22c55e' : fase === 'thinking' ? '#d4a937' : fase === 'speaking' ? '#f8fafc' : '#b8272d';
  const olho = fase === 'speaking' ? 0.35 + Math.min(1, level) * 0.65 : fase === 'listening' ? 0.5 : 0.2;
  return (
    <button type="button" onClick={onClick} aria-label="Falar com o Cigano" data-testid="cigano-avatar" data-fase={fase}
      className="relative shrink-0 rounded-full cursor-pointer" style={{ width: size, height: size }}>
      <span className={`absolute -inset-1.5 rounded-full border-2 ${fase === 'listening' ? 'animate-pulse' : ''} ${fase === 'thinking' ? 'border-dashed animate-spin [animation-duration:3s]' : ''}`} style={{ borderColor: cor, boxShadow: `0 0 24px -2px ${cor}` }} />
      <span className="absolute inset-0 rounded-full overflow-hidden bg-black">
        <img src="/image/cigano-avatar.webp" alt="" className="w-full h-full object-cover" draggable={false} />
        <span className="absolute rounded-full pointer-events-none" style={{ left: '37%', top: '45%', width: '11%', height: '7%', background: `radial-gradient(circle, ${cor}, transparent 70%)`, opacity: olho, mixBlendMode: 'screen' }} />
        <span className="absolute rounded-full pointer-events-none" style={{ left: '56%', top: '46%', width: '11%', height: '7%', background: `radial-gradient(circle, ${cor}, transparent 70%)`, opacity: olho, mixBlendMode: 'screen' }} />
      </span>
    </button>
  );
}

function FormDados({ titulo, botao, onSubmit, onCancel, carregando, testId }: { titulo: string; botao: string; onSubmit: (d: DadosNatais) => void; onCancel?: () => void; carregando?: boolean; testId: string }) {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const ok = fullName.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
  const campo = 'w-full h-11 rounded-xl bg-white/5 border border-white/15 focus:border-[#d4a937] px-3 text-sm text-white outline-none';
  return (
    <form data-testid={testId} className="rounded-2xl border border-[#d4a937]/50 bg-black/60 p-4 space-y-3"
      onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit({ fullName: fullName.trim(), birthDate, birthTime: birthTime || null }); }}>
      <p className="text-xs font-black uppercase tracking-widest text-[#f5d67a]">{titulo}</p>
      <input className={campo} placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid={`${testId}-nome`} autoComplete="off" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-400">Data de nascimento<input type="date" className={`${campo} mt-1`} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} data-testid={`${testId}-data`} /></label>
        <label className="text-[11px] text-slate-400">Hora (se souber)<input type="time" className={`${campo} mt-1`} value={birthTime} onChange={(e) => setBirthTime(e.target.value)} data-testid={`${testId}-hora`} /></label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!ok || carregando} data-testid={`${testId}-ok`} className="flex-1 h-11 rounded-xl bg-[#d4a937] text-black font-black uppercase tracking-wider text-sm disabled:opacity-40 cursor-pointer">{carregando ? 'Embaralhando…' : botao}</button>
        {onCancel && <button type="button" onClick={onCancel} className="h-11 px-4 rounded-xl border border-white/20 text-slate-300 text-sm cursor-pointer">Cancelar</button>}
      </div>
    </form>
  );
}

export function Cigano() {
  const { user, logout } = useApp() as any;
  const navigate = useNavigate();
  const uid = user?.uid || 'dono';
  const nomeDono = String(user?.fullName || '').split(' ')[0] || null;

  const [dono, setDono] = useState<boolean | null>(null);
  const [consulta, setConsulta] = useState<ConsultaPublica | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState(() => newChatId());
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [consultas, setConsultas] = useState<Array<{ id: string; nome: string; atualizadaEm: string; perguntasUsadas: number }>>([]);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>('idle');
  const [level, setLevel] = useState(0);
  const [input, setInput] = useState('');
  const [partial, setPartial] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voz, setVoz] = useState(vozSalva);
  const [ajudaInstalar, setAjudaInstalar] = useState(false);
  const app = useInstalarApp();
  const [relogio, setRelogio] = useState(() => agoraBrasilia(Date.now()));
  const [formNatal, setFormNatal] = useState(false);
  const [outraPara, setOutraPara] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modoPergunta, setModoPergunta] = useState(true);
  const [carta, setCarta] = useState<CartaCigano | null>(null);
  const [preMapa, setPreMapa] = useState<{ dados: DadosNatais; itens: ItemMapa[] } | null>(null);

  const consultaRef = useRef<ConsultaPublica | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const busyRef = useRef(false);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const filaRef = useRef<ItemFala[]>([]);
  const falandoRef = useRef<SpeakHandle | null>(null);
  const loopRef = useRef<Promise<void> | null>(null);
  const falhasVozRef = useRef(0);
  const vozRef = useRef(vozSalva());
  const textoFalandoRef = useRef('');
  const recentesRef = useRef<{ t: string; at: number }[]>([]);
  const listenerRef = useRef<FrocListener | null>(null);
  const querOuvirRef = useRef(false);
  const pendenteRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<(t: string) => void>(() => undefined);

  useEffect(() => { consultaRef.current = consulta; }, [consulta]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { vozRef.current = voz; try { localStorage.setItem(VOZ_KEY, voz ? 'on' : 'off'); } catch { /* sem armazenamento */ } }, [voz]);
  useEffect(() => { const t = window.setInterval(() => setRelogio(agoraBrasilia(Date.now())), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, partial, formNatal, outraPara]);
  useEffect(() => { setChats(listChats(uid)); }, [uid]);
  useEffect(() => {
    cigano.estado().then(() => setDono(true)).catch((e) => setDono(e instanceof CiganoApiError && e.status === 403 ? false : true));
  }, []);
  useEffect(() => {
    if (messages.some((m) => m.streaming)) return;
    const turns = messages.filter((m) => !m.hidden && m.text && !m.ritual).map((m) => ({ role: m.role, text: m.text }));
    if (saveChat(uid, chatId, turns)) setChats(listChats(uid));
  }, [messages, chatId, uid]);

  // ---------------- Voz ----------------
  const pararFala = useCallback(() => {
    filaRef.current.forEach((f) => f.pronta?.abort());
    filaRef.current = [];
    falandoRef.current?.stop();
    falandoRef.current = null;
    setLevel(0);
  }, []);

  const cancelar = useCallback(() => {
    genRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    pararFala();
  }, [pararFala]);

  const rodarFala = useCallback(() => {
    if (loopRef.current) return;
    loopRef.current = (async () => {
      while (filaRef.current.length) {
        const item = filaRef.current.shift()!;
        const t = item.text;
        setFase('speaking');
        let h: SpeakHandle;
        if (falhasVozRef.current < 2) {
          // Já pede o áudio do próximo pedaço enquanto este toca: sem silêncio no meio.
          const prox = filaRef.current[0];
          if (prox && !prox.pronta) prox.pronta = prepararFala(getToken, prox.text);
          h = speakFrocNeural(getToken, t, setLevel, item.pronta);
          falandoRef.current = h;
          try { await h.done; falhasVozRef.current = 0; continue; } catch {
            if (falandoRef.current !== h) break;
            falhasVozRef.current += 1;
          }
        }
        h = speakFrocBrowser(t, setLevel);
        falandoRef.current = h;
        await h.done;
      }
      falandoRef.current = null;
      loopRef.current = null;
      textoFalandoRef.current = '';
      setFase((f) => (f === 'speaking' ? (listenerRef.current ? 'listening' : 'idle') : f));
    })();
  }, []);

  const falar = useCallback((frase: string) => {
    if (!vozRef.current || !frase.trim()) return;
    recentesRef.current = [...recentesRef.current, { t: frase, at: Date.now() }].slice(-12);
    textoFalandoRef.current = `${textoFalandoRef.current} ${frase}`.slice(-800);
    const fila = filaRef.current;
    const ultimo = fila[fila.length - 1];
    if (ultimo && !ultimo.pronta && ultimo.text.length + frase.length < JUNTAR_ATE) ultimo.text = `${ultimo.text} ${frase}`;
    else fila.push({ text: frase });
    rodarFala();
  }, [rodarFala]);

  /** Espera o Cigano terminar de falar (o ritual antes de virar as cartas). */
  const esperarFala = async (gen: number) => {
    while ((loopRef.current || filaRef.current.length) && gen === genRef.current) await new Promise((r) => setTimeout(r, 200));
  };

  // ---------------- Conversa com a IA ----------------
  const enviar = useCallback(async (texto: string, o: { hidden?: boolean; etapa?: EtapaCigano; dados?: DadosNatais | null } = {}) => {
    const limpo = texto.trim();
    if (!limpo) return;
    const gen = genRef.current;
    while (busyRef.current) await new Promise((r) => setTimeout(r, 120));
    if (gen !== genRef.current) return;
    busyRef.current = true;
    const abort = new AbortController();
    abortRef.current = abort;
    setErro(null);
    const u: Msg = { id: mid(), role: 'user', text: limpo, hidden: o.hidden };
    const r: Msg = { id: mid(), role: 'assistant', text: '', streaming: true, etapa: o.etapa };
    const historico: ChatTurn[] = [...messagesRef.current, u]
      .filter((m) => m.text && !m.streaming && !m.ritual)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 11000) }))
      .slice(-16);
    while (historico.length && historico[0].role !== 'user') historico.shift();
    setMessages((p) => [...p, u, r]);
    setFase('thinking');
    let buf = '';
    let acoes: CiganoAcao[] = [];
    try {
      await ciganoChat({ messages: historico, consultaId: consultaRef.current?.id || null, etapa: o.etapa || { tipo: 'conversa' }, dados: o.dados || null }, {
        onDelta: (piece) => {
          if (gen !== genRef.current) return;
          setMessages((p) => p.map((m) => (m.id === r.id ? { ...m, text: m.text + piece } : m)));
          buf += piece;
          const { ready, rest } = takeSentences(buf);
          buf = rest;
          ready.forEach(falar);
        },
        onDone: (res: { text: string; emotion: CiganoEmocao; actions: CiganoAcao[] }) => {
          if (gen !== genRef.current) return;
          setMessages((p) => p.map((m) => (m.id === r.id ? { ...m, text: res.text, streaming: false } : m)));
          if (buf.trim()) falar(buf.trim());
          buf = '';
          acoes = res.actions || [];
        },
      }, abort.signal);
    } catch (e: any) {
      setMessages((p) => p.map((m) => (m.id === r.id ? { ...m, streaming: false } : m)).filter((m) => m.id !== r.id || m.text));
      if (!abort.signal.aborted && gen === genRef.current) setErro(e instanceof CiganoApiError ? e.message : 'Sem conexão com o Cigano agora.');
    } finally {
      busyRef.current = false;
      if (abortRef.current === abort) abortRef.current = null;
      if (!loopRef.current) setFase(listenerRef.current ? 'listening' : 'idle');
    }
    if (acoes.length && gen === genRef.current) void executarAcoes(acoes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [falar]);

  const nota = (texto: string, extra: Partial<Msg> = {}) => setMessages((p) => [...p, { id: mid(), role: 'assistant', text: texto, ...extra }]);

  // ---------------- A mesa ----------------
  const abrirMesa = useCallback(async (dados: DadosNatais) => {
    cancelar();
    const gen = genRef.current;
    setCarregando(true);
    setErro(null);
    try {
      const { consulta: c } = await cigano.abrir(dados);
      setConsulta(c);
      consultaRef.current = c;
      setFormNatal(false);
      setPreMapa(null);
      setChatId(c.id);
      const ritual = aberturaDaMesa(dados.fullName);
      nota(ritual.join('\n'), { ritual: true });
      ritual.forEach(falar);
      await esperarFala(gen);
      if (gen !== genRef.current) return;
      const t = c.tiragens.find((x) => x.tipo === 'abertura')!;
      setMessages((p) => [...p, { id: mid(), role: 'assistant', text: '', tiragemId: t.id, animar: true }]);
      await new Promise((r) => setTimeout(r, 21 * 220 + 300));
      if (gen !== genRef.current) return;
      // Uma leitura só, com os 3 montes juntos: o Cigano entende tudo antes de falar.
      await enviar('[ABERTURA] Leia o jogo de abertura completo (os 3 montes).', { hidden: true, etapa: { tipo: 'abertura' } });
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível abrir a mesa.');
    } finally {
      setCarregando(false);
    }
  }, [cancelar, enviar, falar]);

  const fazerCruz = useCallback(async () => {
    const atual = consultaRef.current;
    if (!atual) { setFormNatal(true); return; }
    cancelar();
    const gen = genRef.current;
    setCarregando(true);
    try {
      const { consulta: c } = await cigano.cruz(atual.id);
      setConsulta(c);
      consultaRef.current = c;
      const t = c.tiragens.find((x) => x.tipo === 'cruz')!;
      const chamado = ['Embaralhando de novo para a cruz.', ...chamadoDoNome(c.dados.fullName)];
      nota(chamado.join('\n'), { ritual: true });
      chamado.forEach(falar);
      await esperarFala(gen);
      if (gen !== genRef.current) return;
      setMessages((p) => [...p, { id: mid(), role: 'assistant', text: '', tiragemId: t.id, animar: true }]);
      await new Promise((r) => setTimeout(r, 35 * 140 + 300));
      if (gen !== genRef.current) return;
      // Uma leitura só, com os 5 montes juntos.
      await enviar('[CRUZ] Leia a cruz completa (os 5 montes).', { hidden: true, etapa: { tipo: 'sintese_cruz' } });
      setModoPergunta(true);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível fazer a cruz.');
    } finally {
      setCarregando(false);
    }
  }, [cancelar, enviar, falar]);

  const tirarPergunta = useCallback(async (pergunta: string, outra?: DadosNatais | null) => {
    const atual = consultaRef.current;
    if (!atual) { setFormNatal(true); return; }
    if (atual.perguntasUsadas >= MAX_PERGUNTAS) { nota(`As ${MAX_PERGUNTAS} perguntas desta consulta já foram feitas. Para mais perguntas, abra uma nova consulta.`); return; }
    if (outra === undefined && envolveOutraPessoa(pergunta)) { setOutraPara(pergunta); return; }
    cancelar();
    const gen = genRef.current;
    setOutraPara(null);
    setCarregando(true);
    try {
      setMessages((p) => [...p, { id: mid(), role: 'user', text: pergunta }]);
      const { consulta: c, tiragemId, indice } = await cigano.pergunta(atual.id, pergunta, outra || null);
      setConsulta(c);
      consultaRef.current = c;
      chamadoDoNome(c.dados.fullName).slice(0, 1).forEach(falar);
      setMessages((p) => [...p, { id: mid(), role: 'assistant', text: '', tiragemId, animar: true }]);
      await new Promise((r) => setTimeout(r, 7 * 450 + 300));
      if (gen !== genRef.current) return;
      await enviar(`[PERGUNTA ${indice}] ${pergunta}`, { hidden: true, etapa: { tipo: 'pergunta', indice } });
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível tirar as cartas da pergunta.');
    } finally {
      setCarregando(false);
    }
  }, [cancelar, enviar, falar]);

  const novaConsulta = () => {
    cancelar();
    setConsulta(null);
    consultaRef.current = null;
    setMessages([]);
    setChatId(newChatId());
    setOutraPara(null);
    setPreMapa(null);
    setFormNatal(true);
  };

  const novaConversa = () => {
    cancelar();
    setMessages([]);
    setChatId(newChatId());
    setConsulta(null);
    consultaRef.current = null;
    setFormNatal(false);
    setOutraPara(null);
  };

  const abrirConsultaSalva = async (id: string) => {
    cancelar();
    try {
      const { consulta: c } = await cigano.consulta(id);
      setConsulta(c);
      consultaRef.current = c;
      setChatId(c.id);
      const salvo = listChats(uid).find((x) => x.id === c.id);
      const mesas: Msg[] = c.tiragens.map((t) => ({ id: mid(), role: 'assistant', text: '', tiragemId: t.id }));
      setMessages([...mesas, ...(salvo?.turns || []).map((t) => ({ id: mid(), role: t.role, text: t.text }))]);
      setFormNatal(false);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível abrir a consulta.');
    }
  };

  async function executarAcoes(acoes: CiganoAcao[]) {
    for (const a of acoes) {
      if (a.name === 'pedir_dados_natais' || a.name === 'nova_consulta') { if (a.name === 'nova_consulta') novaConsulta(); else setFormNatal(true); }
      else if (a.name === 'abrir_mesa') { if (preMapa) void abrirMesa(preMapa.dados); else setFormNatal(true); }
      else if (a.name === 'fazer_cruz') void fazerCruz();
      else if (a.name === 'tirar_pergunta') void tirarPergunta(a.pergunta);
      else if (a.name === 'pedir_dados_outra_pessoa') setOutraPara(a.pergunta);
      else if (a.name === 'open_page') { if (a.page === 'interpretacoes') navigate('/interpretacoes'); else if (a.page === 'consultas') { void carregarConsultas(); setMenu(true); } else if (a.page === 'termos') navigate('/termos'); else if (a.page === 'privacidade') navigate('/privacidade'); }
      else if (a.name === 'end_conversation') window.setTimeout(() => { pararOuvir(); }, 2500);
    }
  }

  const carregarConsultas = async () => {
    try { setConsultas((await cigano.consultas()).consultas); } catch { /* sem lista */ }
  };

  // ---------------- Escuta ----------------
  function eco(texto: string): boolean {
    const n = normalizar(texto);
    if (!n) return true;
    if (loopRef.current && normalizar(textoFalandoRef.current).includes(n)) return true;
    return pareceEco(texto, recentesRef.current.filter((r) => Date.now() - r.at < 25_000).map((r) => r.t));
  }

  const pararOuvir = useCallback(() => {
    querOuvirRef.current = false;
    listenerRef.current?.stop();
    listenerRef.current = null;
    setListening(false);
    setPartial('');
    setFase((f) => (f === 'listening' ? 'idle' : f));
  }, []);

  const ouvir = useCallback(async () => {
    querOuvirRef.current = true;
    if (listenerRef.current) return;
    setErro(null);
    try {
      listenerRef.current = await startFrocListener(getToken, {
        onPartial: (t) => { if (loopRef.current && eco(t)) return; setPartial(t); },
        onFinal: (t) => {
          if (loopRef.current && mandouParar(t, textoFalandoRef.current)) { pendenteRef.current = ''; setPartial(''); entradaRef.current('pare'); return; }
          if (loopRef.current && eco(t)) return;
          pendenteRef.current = mergeFinal(pendenteRef.current, t);
          setPartial(pendenteRef.current);
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            const dito = pendenteRef.current;
            pendenteRef.current = '';
            setPartial('');
            if (dito && !eco(dito)) entradaRef.current(dito);
          }, DEBOUNCE_MS);
        },
        onError: (m) => { setErro(m); pararOuvir(); },
        onInterrupted: () => {
          listenerRef.current?.stop();
          listenerRef.current = null;
          window.setTimeout(() => { if (querOuvirRef.current) void ouvirRef.current(); }, 900);
        },
      });
      setListening(true);
      setFase((f) => (f === 'idle' ? 'listening' : f));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível abrir o microfone. Você pode digitar.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pararOuvir]);
  const ouvirRef = useRef(ouvir);
  ouvirRef.current = ouvir;
  useEffect(() => () => { listenerRef.current?.stop(); falandoRef.current?.stop(); }, []);

  // ---------------- Tudo o que o dono diz/escreve ----------------
  entradaRef.current = (texto: string) => {
    const c = consultaRef.current;
    const ctx = { temConsulta: !!c || !!preMapa, temAbertura: !!c?.tiragens.some((t) => t.tipo === 'abertura'), temCruz: !!c?.tiragens.some((t) => t.tipo === 'cruz') };
    const it = detectarIntencao(texto, ctx);
    if (it) {
      if (it.kind === 'stop') { cancelar(); return; }
      if (it.kind === 'new_chat') { novaConversa(); return; }
      if (it.kind === 'end_chat') { novaConversa(); pararOuvir(); return; }
      if (it.kind === 'delete_chat') { setMenu(true); setConfirmDel(chatId); return; }
      if (it.kind === 'nova_consulta') { novaConsulta(); return; }
      if (it.kind === 'abrir_mesa') { if (preMapa) void abrirMesa(preMapa.dados); else setFormNatal(true); return; }
      if (it.kind === 'fazer_cruz') { void fazerCruz(); return; }
      if (it.kind === 'abrir_pagina') { if (it.page === 'interpretacoes') navigate('/interpretacoes'); else { void carregarConsultas(); setMenu(true); } return; }
    }
    if (loopRef.current || busyRef.current) cancelar();
    // Depois da cruz, o que ele pergunta vira pergunta para as cartas (até 5).
    const temCruz = !!c?.tiragens.some((t) => t.tipo === 'cruz');
    if (c && temCruz && modoPergunta && c.perguntasUsadas < MAX_PERGUNTAS) {
      void tirarPergunta(texto);
      return;
    }
    void enviar(texto);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    entradaRef.current(t);
  };

  const comecarVoz = () => { if (listening) pararOuvir(); else void ouvir(); };
  const avatarClick = () => { if (loopRef.current) { pararFala(); return; } comecarVoz(); };

  const preverMapa = async (dados: DadosNatais) => {
    setCarregando(true);
    setErro(null);
    let ok = false;
    try { setPreMapa(await cigano.natal(dados)); ok = true; } catch (e: any) { setErro(e?.message || 'Dados inválidos.'); } finally { setCarregando(false); }
    // O retrato: o Cigano mostra que conhece a pessoa antes de abrir a mesa.
    if (ok) void enviar(`[RETRATO NATAL] Apresente ${dados.fullName}.`, { hidden: true, etapa: { tipo: 'apresentacao' }, dados });
  };

  const tiragemPorId = (id?: string): Tiragem | undefined => consulta?.tiragens.find((t) => t.id === id);
  const indicePergunta = (id?: string) => (consulta ? consulta.tiragens.filter((t) => t.tipo === 'pergunta').findIndex((t) => t.id === id) + 1 : 0);
  // O retrato natal escrito pelo Cigano aparece DENTRO do painel do mapa, não solto na conversa.
  const retratoMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.etapa?.tipo === 'apresentacao');
  const visiveis = messages.filter((m) => !m.hidden && m !== retratoMsg && (m.text || m.streaming || m.tiragemId));
  const temAbertura = !!consulta?.tiragens.some((t) => t.tipo === 'abertura');
  const temCruz = !!consulta?.tiragens.some((t) => t.tipo === 'cruz');
  const saud = saudacaoDoHorario(Date.now());
  const dadosAtuais = consulta?.dados || preMapa?.dados || null;
  const blocoParaCopiar = (m: Msg) => ({ ...tituloDoBloco(m.etapa, consulta?.tiragens || []), fala: m.text });
  const copiarBloco = (m: Msg) => textoDoBloco({ dados: dadosAtuais, ...blocoParaCopiar(m) });
  const blocosDaConsulta = () => messages.filter((m) => m.role === 'assistant' && m.text && !m.ritual && !m.streaming && m.etapa && m.etapa.tipo !== 'conversa').map(blocoParaCopiar);
  const alternarVoz = () => { setVoz((v) => { if (v) pararFala(); return !v; }); };
  const instalarApp = async () => {
    const r = await app.instalar();
    if (r === 'manual') setAjudaInstalar(true);
  };

  if (dono === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center" data-testid="cigano-restrito">
        <div className="max-w-sm space-y-3">
          <img src="/image/cigano.webp" alt="O Cigano" className="w-44 h-44 mx-auto rounded-full object-cover border-2 border-[#d4a937]/60" />
          <p className="text-white font-bold">Área exclusiva do Cigano.</p>
          <p className="text-slate-400 text-sm">Esta conta não tem acesso. Entre com a conta do dono.</p>
          <button onClick={() => logout?.()} className="text-sm text-[#d4a937] underline cursor-pointer">Sair e entrar com outra conta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col text-white bg-[#050304]" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(212,169,55,.16), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(236,72,153,.10), transparent 45%), radial-gradient(ellipse at 0% 100%, rgba(34,197,94,.07), transparent 45%), #050304' }} data-testid="cigano-home">
      {/* Fundo: a mesa cigana sob a lua (escurecido para ler bem) */}
      <picture className="pointer-events-none absolute inset-0" aria-hidden="true">
        <source media="(max-width: 767px)" srcSet="/image/fundo-cigano-celular.webp" />
        <img src="/image/fundo-cigano.webp" alt="" className="w-full h-full object-cover opacity-[0.32]" />
      </picture>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85" aria-hidden="true" />
      <header className="relative flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-[#d4a937]/20">
        <button type="button" onClick={() => { setMenu(true); void carregarConsultas(); setChats(listChats(uid)); }} aria-label="Abrir menu" data-testid="cigano-menu-button" className="w-10 h-10 rounded-xl border border-[#d4a937]/50 text-[#f5d67a] flex items-center justify-center cursor-pointer"><Menu className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <img src="/image/cigano-avatar.webp" alt="" className="hidden min-[420px]:block w-9 h-9 rounded-full border border-[#d4a937]/60 object-cover" />
          <div className="min-w-0">
            <h1 className="font-black tracking-[0.3em] text-xs sm:text-base truncate cg-ouro-vivo">MAGIA DO TAROT</h1>
            <p className="text-[10px] text-slate-400 truncate">o Reino Encantado das Cartas</p>
          </div>
        </div>
        <span className="hidden sm:block text-[11px] text-slate-400 font-mono" data-testid="cigano-relogio">{relogio}</span>
        {!app.instalado && (
          <button type="button" onClick={() => void instalarApp()} data-testid="cigano-instalar" aria-label="Baixar o aplicativo" className="h-10 px-3 rounded-xl border border-[#d4a937]/50 text-[#f5d67a] flex items-center gap-1.5 text-xs font-bold cursor-pointer"><Download className="w-4 h-4" /><span className="hidden sm:inline">Baixar app</span></button>
        )}
        <button type="button" onClick={alternarVoz} data-testid="cigano-audio" aria-pressed={voz} aria-label={voz ? 'Desligar o áudio do Cigano' : 'Ligar o áudio do Cigano'}
          className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold cursor-pointer ${voz ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10' : 'border-pink-500/60 text-pink-300 bg-pink-500/10'}`}>
          {voz ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}<span>{voz ? 'Áudio ligado' : 'Áudio desligado'}</span>
        </button>
      </header>

      <main className="relative flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col">
        <div ref={listaRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3" data-testid="cigano-conversa">
          {consulta && <MapaNatalPainel nome={consulta.dados.fullName} nascimento={consulta.dados.birthDate} hora={consulta.dados.birthTime} itens={consulta.mapaItens} retrato={retratoMsg?.text} lendo={retratoMsg ? !!retratoMsg.streaming : fase === 'thinking'} onPedirRetrato={() => void enviar(`[RETRATO NATAL] Apresente ${consulta.dados.fullName}.`, { hidden: true, etapa: { tipo: 'apresentacao' }, dados: consulta.dados })} />}
          {!consulta && preMapa && <MapaNatalPainel nome={preMapa.dados.fullName} nascimento={preMapa.dados.birthDate} hora={preMapa.dados.birthTime} itens={preMapa.itens} retrato={retratoMsg?.text} lendo={retratoMsg ? !!retratoMsg.streaming : fase === 'thinking'} onPedirRetrato={() => void enviar(`[RETRATO NATAL] Apresente ${preMapa.dados.fullName}.`, { hidden: true, etapa: { tipo: 'apresentacao' }, dados: preMapa.dados })} />}

          {!visiveis.length && !formNatal && !preMapa && (
            <div className="flex flex-col items-center text-center gap-4 pt-6">
              <Avatar fase={fase} level={level} size={150} onClick={avatarClick} />
              <div>
                <p className="text-2xl sm:text-3xl font-black">{saud.replace(/^./, (x) => x.toUpperCase())}{nomeDono ? `, ${nomeDono}` : ''}. <span className="cg-ouro-vivo">A mesa está pronta.</span></p>
                <p className="text-sm text-slate-400 mt-2">Tarô de Thoth (Crowley) · 78 cartas · retrato natal completo · todos os oráculos.</p>
                <p className="sm:hidden text-[11px] text-slate-500 font-mono mt-2">{relogio}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setFormNatal(true)} data-testid="cigano-nova-consulta" className="px-5 py-3 rounded-full bg-gradient-to-r from-[#b8892a] via-[#f5d67a] to-[#b8892a] text-black font-black text-sm cursor-pointer shadow-[0_0_28px_-4px_rgba(245,214,122,0.8)] hover:scale-105 transition-transform"><Sparkles className="w-4 h-4 inline mr-1" /> Nova consulta</button>
                <button type="button" onClick={comecarVoz} className="px-5 py-3 rounded-full border border-[#d4a937]/50 text-sm cursor-pointer">{listening ? 'Ouvindo…' : 'Conversar com o Cigano'}</button>
              </div>
            </div>
          )}

          {visiveis.map((m) => {
            const t = tiragemPorId(m.tiragemId);
            if (m.tiragemId && t) return <div key={m.id} className="pt-1"><MesaTiragem tiragem={t} animar={!!m.animar} onCarta={setCarta} indicePergunta={indicePergunta(t.id)} /></div>;
            return (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`cg-fala max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-pink-500/10 border border-pink-500/35' : m.ritual ? 'bg-[#2a0d0f]/75 border border-[#b8272d]/60 italic shadow-[0_0_30px_-10px_rgba(184,39,45,0.7)]' : 'cg-mesa'}`}>
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100" data-testid={m.role === 'assistant' ? (m.ritual ? 'cigano-ritual' : 'cigano-resposta') : 'dono-msg'}>
                    {m.role === 'assistant' && !m.ritual ? <TextoComRotulos texto={m.text} /> : m.text}
                    {m.streaming && <span className="inline-block w-2 h-4 bg-[#d4a937] ml-1 animate-pulse align-middle" />}
                  </div>
                  {!m.text && m.streaming && <Loader2 className="w-4 h-4 animate-spin text-[#d4a937]" />}
                  {m.role === 'assistant' && !m.ritual && !m.streaming && m.text && (
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#d4a937]/15 pt-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#d4a937]/80 font-bold truncate">{tituloDoBloco(m.etapa, consulta?.tiragens || []).titulo}</span>
                      <BotaoCopiar texto={() => copiarBloco(m)} testId="copiar-bloco" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {partial && <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl px-4 py-2 text-sm text-pink-200/80 italic border border-dashed border-pink-500/40">{partial}</p></div>}

          {formNatal && !consulta && (
            preMapa ? (
              <div className="flex flex-wrap gap-2" data-testid="cigano-confirmar-mapa">
                <button type="button" onClick={() => void abrirMesa(preMapa.dados)} disabled={carregando} data-testid="cigano-abrir-mesa" className="flex-1 h-12 rounded-xl bg-[#d4a937] text-black font-black uppercase tracking-wider text-sm cursor-pointer disabled:opacity-50">{carregando ? 'Abrindo…' : 'Abrir a mesa'}</button>
                <button type="button" onClick={() => setPreMapa(null)} className="h-12 px-4 rounded-xl border border-white/20 text-slate-300 text-sm cursor-pointer">Corrigir dados</button>
              </div>
            ) : (
              <FormDados testId="form-natal" titulo="Dados natais de quem chegou" botao="Ver o mapa natal" carregando={carregando} onSubmit={preverMapa} onCancel={() => setFormNatal(false)} />
            )
          )}

          {outraPara && (
            <div className="space-y-2">
              <p className="text-sm text-slate-200">Para responder “{outraPara}”, preciso dos dados natais da outra pessoa:</p>
              <FormDados testId="form-outra" titulo="Dados natais da outra pessoa" botao="Comparar e tirar as cartas" carregando={carregando} onSubmit={(d) => void tirarPergunta(outraPara, d)} onCancel={() => setOutraPara(null)} />
              <button type="button" onClick={() => void tirarPergunta(outraPara, null)} className="text-xs text-slate-400 underline cursor-pointer">Não tenho os dados: tirar só pela pergunta</button>
            </div>
          )}

          {consulta && !carregando && fase !== 'thinking' && (
            <div className="flex flex-wrap gap-2 pt-1" data-testid="cigano-proximos-passos">
              {temAbertura && !temCruz && <button type="button" onClick={() => void fazerCruz()} data-testid="cigano-fazer-cruz" className="px-4 py-2 rounded-full bg-[#d4a937] text-black text-sm font-bold cursor-pointer">Fazer a cruz</button>}
              {temCruz && <span className="px-3 py-2 rounded-full border border-emerald-500/40 text-emerald-300 text-xs">Perguntas: {consulta.perguntasUsadas}/{MAX_PERGUNTAS}</span>}
              <button type="button" onClick={novaConsulta} className="px-4 py-2 rounded-full border border-white/20 text-slate-300 text-sm cursor-pointer">Nova consulta</button>
              {blocosDaConsulta().length > 0 && <BotaoCopiar rotulo="Copiar consulta inteira" testId="copiar-consulta" texto={() => textoDaConsulta(consulta.dados, blocosDaConsulta())} />}
            </div>
          )}

          {consulta && temCruz && modoPergunta && consulta.perguntasUsadas < MAX_PERGUNTAS && !carregando && fase !== 'thinking' && !outraPara && (
            <div className="rounded-2xl border border-[#d4a937]/30 bg-black/40 p-3" data-testid="perguntas-prontas">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#f5d67a] mb-2">O que a pessoa quer saber — toque para tirar as cartas</p>
              <div className="flex flex-wrap gap-2">
                {PERGUNTAS_PRONTAS.map((q) => (
                  <button key={q.texto} type="button" data-testid="pergunta-pronta" onClick={() => (q.outra ? setOutraPara(q.texto) : void tirarPergunta(q.texto, null))}
                    className="px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-[13px] text-slate-100 hover:border-[#d4a937] hover:text-[#f5d67a] cursor-pointer text-left">{q.texto}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {erro && <p className="px-4 pb-1 text-xs text-pink-300" role="alert">{erro}</p>}
        <div className="px-3 sm:px-4 pb-2 pt-1 space-y-2">
          {consulta && temCruz && consulta.perguntasUsadas < MAX_PERGUNTAS && (
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setModoPergunta(true)} className={`px-3 py-1 rounded-full border cursor-pointer ${modoPergunta ? 'border-[#d4a937] text-[#f5d67a]' : 'border-white/15 text-slate-400'}`}>Pergunta para as cartas</button>
              <button type="button" onClick={() => setModoPergunta(false)} className={`px-3 py-1 rounded-full border cursor-pointer ${!modoPergunta ? 'border-[#d4a937] text-[#f5d67a]' : 'border-white/15 text-slate-400'}`}>Conversar</button>
            </div>
          )}
          <form onSubmit={submit} className="flex items-center gap-2" data-testid="cigano-composer">
            {visiveis.length > 0 && <Avatar fase={fase} level={level} size={44} onClick={avatarClick} />}
            <button type="button" onClick={comecarVoz} aria-label={listening ? 'Desligar microfone' : 'Falar'} data-testid="cigano-mic" className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border ${listening ? 'bg-emerald-500 text-black border-emerald-400' : 'border-[#d4a937]/60 text-[#f5d67a]'}`}>{listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}</button>
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={3000} data-testid="cigano-input" aria-label="Mensagem para o Cigano"
              placeholder={consulta && temCruz && modoPergunta && consulta.perguntasUsadas < MAX_PERGUNTAS ? `Pergunta ${consulta.perguntasUsadas + 1} de ${MAX_PERGUNTAS}…` : 'Fale com o Cigano…'}
              className="flex-1 min-w-0 h-11 rounded-full bg-white/5 border border-white/15 focus:border-[#d4a937] px-4 text-sm text-white placeholder:text-slate-500 outline-none" />
            <button type="submit" aria-label="Enviar" data-testid="cigano-send" disabled={!input.trim()} className="shrink-0 w-11 h-11 rounded-full bg-[#d4a937] text-black flex items-center justify-center cursor-pointer disabled:opacity-40"><Send className="w-5 h-5" /></button>
          </form>
          <p className="text-center text-[10px] text-slate-500">Cigano · {FASE_LABEL[fase]}</p>
        </div>
        <footer className="pb-3 flex items-center justify-center gap-4 text-[11px] text-slate-500" data-testid="cigano-rodape">
          <a href="/termos" onClick={(e) => { e.preventDefault(); navigate('/termos'); }}>Termos de uso</a>
          <span>·</span>
          <a href="/privacidade" onClick={(e) => { e.preventDefault(); navigate('/privacidade'); }}>Política de privacidade</a>
        </footer>
      </main>

      {carta && <DetalheCarta carta={carta} onClose={() => setCarta(null)} />}

      {ajudaInstalar && (
        <div className="fixed inset-0 z-[95] bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={() => setAjudaInstalar(false)} role="dialog" aria-modal="true" data-testid="ajuda-instalar">
          <div className="max-w-sm w-full rounded-2xl border border-[#d4a937]/50 bg-[#0b0607] p-5 space-y-3 text-sm text-slate-200" onClick={(e) => e.stopPropagation()}>
            <p className="font-black text-[#f5d67a] text-base">Baixar o Magia do Tarot</p>
            {app.ios ? (
              <ol className="list-decimal pl-5 space-y-1">
                <li>Abra este site no <b>Safari</b>.</li>
                <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
                <li>Toque em <b>Adicionar à Tela de Início</b> e depois em <b>Adicionar</b>.</li>
              </ol>
            ) : (
              <ol className="list-decimal pl-5 space-y-1">
                <li>No <b>Chrome</b> ou no <b>Edge</b>, toque no menu <b>⋮</b> do navegador.</li>
                <li>Toque em <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>).</li>
                <li>Confirme: o ícone do Cigano aparece junto dos seus aplicativos.</li>
              </ol>
            )}
            <button type="button" onClick={() => setAjudaInstalar(false)} className="w-full h-10 rounded-xl bg-[#d4a937] text-black font-black cursor-pointer">Entendi</button>
          </div>
        </div>
      )}

      {/* Menu ☰ */}
      <div className={`fixed inset-0 z-[80] ${menu ? '' : 'pointer-events-none invisible'}`} aria-hidden={!menu}>
        <div className={`absolute inset-0 bg-black/70 transition-opacity ${menu ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMenu(false)} />
        <aside data-testid="cigano-menu" className={`absolute left-0 top-0 h-full w-[86%] max-w-xs bg-[#070405] border-r border-[#d4a937]/40 overflow-y-auto transition-transform duration-200 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#d4a937]/30">
            <span className="font-black tracking-widest text-sm text-[#f5d67a]">MENU DO CIGANO</span>
            <button onClick={() => setMenu(false)} aria-label="Fechar menu" className="w-8 h-8 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {(() => {
            const item = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-[#d4a937]/10 cursor-pointer text-left';
            const go = (fn: () => void) => () => { setMenu(false); setConfirmDel(null); fn(); };
            return (
              <>
                <nav className="py-1">
                  <button className={item} onClick={go(novaConsulta)} data-testid="menu-nova-consulta"><Sparkles className="w-4 h-4 text-[#d4a937]" /> Nova consulta</button>
                  <button className={item} onClick={go(novaConversa)} data-testid="menu-nova-conversa"><Plus className="w-4 h-4 text-emerald-400" /> Nova conversa</button>
                  <button className={item} onClick={go(() => navigate('/interpretacoes'))} data-testid="menu-interpretacoes"><BookOpen className="w-4 h-4 text-pink-400" /> Minhas interpretações das cartas</button>
                  <button className={item} onClick={go(alternarVoz)} data-testid="menu-audio">{voz ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />} {voz ? 'Desligar o áudio' : 'Ligar o áudio'}</button>
                  {!app.instalado && <button className={item} onClick={go(() => void instalarApp())} data-testid="menu-instalar"><Download className="w-4 h-4 text-[#d4a937]" /> Baixar como aplicativo</button>}
                </nav>
                <p className="px-4 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1"><History className="w-3 h-3" /> Consultas salvas</p>
                <ul className="pb-2" data-testid="menu-consultas">
                  {!consultas.length && <li className="px-4 py-1 text-xs text-slate-500">Nenhuma consulta ainda.</li>}
                  {consultas.map((c) => (
                    <li key={c.id}><button className={item} onClick={go(() => void abrirConsultaSalva(c.id))}><Sparkles className="w-3.5 h-3.5 text-[#d4a937]" /><span className="min-w-0"><span className="block truncate">{c.nome}</span><span className="block text-[10px] text-slate-500">{formatChatDate(Date.parse(c.atualizadaEm))} · {c.perguntasUsadas}/5 perguntas</span></span></button></li>
                  ))}
                </ul>
                <p className="px-4 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">Conversas neste aparelho</p>
                <ul className="pb-2" data-testid="menu-conversas">
                  {!chats.length && <li className="px-4 py-1 text-xs text-slate-500">Nenhuma conversa ainda.</li>}
                  {chats.map((c) => (
                    <li key={c.id} className="flex items-center pr-2">
                      {confirmDel === c.id ? (
                        <div className="flex-1 flex items-center gap-2 px-4 py-2 text-xs">
                          <span className="text-pink-300 flex-1">Excluir esta conversa?</span>
                          <button className="px-2 py-1 rounded bg-pink-600 cursor-pointer" data-testid="menu-excluir-sim" onClick={() => { deleteChat(uid, c.id); if (c.id === chatId) novaConversa(); setChats(listChats(uid)); setConfirmDel(null); }}>Excluir</button>
                          <button className="px-2 py-1 rounded border border-slate-600 cursor-pointer" onClick={() => setConfirmDel(null)}>Não</button>
                        </div>
                      ) : (
                        <>
                          <button className={`${item} min-w-0`} onClick={go(() => { const msgs = c.turns.map((t) => ({ id: mid(), role: t.role, text: t.text })); setMessages(msgs); setChatId(c.id); })}>
                            <MessageSquare className="w-3.5 h-3.5 text-[#d4a937] shrink-0" /><span className="min-w-0"><span className="block truncate">{c.title}</span><span className="block text-[10px] text-slate-500">{formatChatDate(c.updatedAt)}</span></span>
                          </button>
                          <button aria-label="Excluir conversa" data-testid="menu-excluir" className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-pink-400 cursor-pointer" onClick={() => setConfirmDel(c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <nav className="border-t border-white/10 py-1">
                  <button className={item} onClick={go(novaConversa)} data-testid="menu-fechar-conversa"><X className="w-4 h-4 text-pink-400" /> Fechar conversa</button>
                  <a href="/termos" onClick={(e) => { e.preventDefault(); setMenu(false); navigate('/termos'); }} className="block px-4 py-2 text-xs text-slate-500">Termos de uso</a>
                  <a href="/privacidade" onClick={(e) => { e.preventDefault(); setMenu(false); navigate('/privacidade'); }} className="block px-4 py-2 text-xs text-slate-500">Política de privacidade</a>
                  <button className={item} onClick={go(() => logout?.())}><LogOut className="w-4 h-4 text-pink-400" /> Sair</button>
                </nav>
              </>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}

export default Cigano;
