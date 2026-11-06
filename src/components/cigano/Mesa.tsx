import React, { useEffect, useState } from 'react';
import { CartaVisual } from './CartaVisual.js';
import { CRUZ_LAYOUT, GRUPOS_DE_SETE, type CartaCigano, type Tiragem } from '../../cigano/metodo.js';
import type { ItemMapa } from '../../cigano/client/api.js';
import { copiarTexto, primeiroNome, textoDoBloco, textoDoMapa } from '../../cigano/copiar.js';

/** Botão "Copiar" (texto já personalizado para mandar à pessoa). */
export function BotaoCopiar({ texto, rotulo = 'Copiar', testId }: { texto: () => string; rotulo?: string; testId?: string }) {
  const [ok, setOk] = useState<null | boolean>(null);
  return (
    <button type="button" data-testid={testId || 'copiar'} aria-label={rotulo}
      onClick={async (e) => { e.stopPropagation(); const r = await copiarTexto(texto()); setOk(r); window.setTimeout(() => setOk(null), 1800); }}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${ok ? 'border-emerald-400 text-emerald-300' : ok === false ? 'border-pink-400 text-pink-300' : 'border-[#d4a937]/50 text-[#f5d67a] hover:bg-[#d4a937]/10'}`}>
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
      {ok ? 'Copiado!' : ok === false ? 'Não copiou' : rotulo}
    </button>
  );
}

/** Revela as cartas uma a uma (como na mesa). */
function useRevelar(total: number, ativo: boolean, intervalo = 650): number {
  const [n, setN] = useState(ativo ? 0 : total);
  useEffect(() => {
    if (!ativo) { setN(total); return; }
    setN(0);
    let i = 0;
    const t = window.setInterval(() => { i += 1; setN(i); if (i >= total) window.clearInterval(t); }, intervalo);
    return () => window.clearInterval(t);
  }, [total, ativo, intervalo]);
  return n;
}

/** Estrelas flutuando sobre a mesa (posições fixas: nada de sorteio a cada render). */
const ESTRELAS = [[8, 70, 0], [22, 30, 1.6], [37, 82, 3.1], [51, 18, 0.8], [64, 64, 2.4], [78, 36, 4.2], [91, 76, 1.2], [15, 50, 5.1], [70, 88, 3.7], [45, 45, 6]];
function Estrelas() {
  return (
    <span className="cg-estrelas" aria-hidden="true">
      {ESTRELAS.map(([x, y, d], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
    </span>
  );
}

/**
 * Largura de cada carta medida pelo espaço do próprio monte (container query): as 7 em leque
 * cabem no celular e em cada braço da cruz no computador, sem transbordar nem ficar minúsculas.
 */
const LARGURA_LEQUE = { sm: 'min(70px, calc(100cqw / 6.7))', md: 'min(96px, calc(100cqw / 6.7))' };
const INCLINA = [-7, 0, 7];

/** 7 cartas em 3 leques: 1-2-3 (1ª resposta), 4-5-6 (2ª resposta) e a 7ª, o coringa. */
function Sete({ cartas, reveladas, tamanho = 'md', onCarta, atrasoBase = 0 }: { cartas: CartaCigano[]; reveladas: number; tamanho?: 'sm' | 'md'; onCarta?: (c: CartaCigano) => void; atrasoBase?: number }) {
  const largura = LARGURA_LEQUE[tamanho];
  return (
    <div className="flex flex-nowrap items-end justify-center pt-2 w-full" style={{ containerType: 'inline-size', gap: `calc(${largura} * 0.25)` }}>
      {GRUPOS_DE_SETE.map((g, gi) => (
        <div key={gi} className="flex flex-col items-center gap-2">
          <div className="flex items-end">
            {g.cartas.map((i, k) => (
              <CartaVisual key={i} carta={cartas[i]} revelada={i < reveladas} tamanho={tamanho} ordem={i + 1} coringa={i === 6}
                largura={largura} inclinar={g.cartas.length === 3 ? INCLINA[k] : 0}
                sobrepor={k > 0 ? `calc(${largura} * -0.26)` : undefined} atraso={atrasoBase + i * 70}
                onClick={() => i < reveladas && onCarta?.(cartas[i])} />
            ))}
          </div>
          <span className={`whitespace-nowrap uppercase font-black ${tamanho === 'sm' ? 'text-[8px] tracking-[0.06em]' : 'text-[9px] sm:text-[10px] tracking-[0.18em]'} ${gi === 2 ? 'text-pink-300' : 'text-[#f5d67a]'}`}>
            {gi === 2 ? 'coringa' : tamanho === 'sm' ? `${gi + 1}ª resp.` : `${gi + 1}ª resposta`}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tela larga (cruz desenhada em cruz) ou celular (um monte embaixo do outro). */
function useTelaLarga(): boolean {
  const consulta = '(min-width: 768px)';
  const [larga, setLarga] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return undefined;
    const ao = () => setLarga(mq.matches);
    mq.addEventListener?.('change', ao);
    return () => mq.removeEventListener?.('change', ao);
  }, []);
  return larga;
}

function TituloMesa({ children }: { children: React.ReactNode }) {
  return <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] mb-3 cg-ouro-vivo">✦ {children} ✦</p>;
}

export function MesaTiragem({ tiragem, animar, onCarta, indicePergunta }: { tiragem: Tiragem; animar: boolean; onCarta?: (c: CartaCigano) => void; indicePergunta?: number }) {
  const total = tiragem.montes ? tiragem.montes.length * 7 : 7;
  const reveladas = useRevelar(total, animar, tiragem.tipo === 'cruz' ? 140 : tiragem.montes ? 220 : 450);
  const larga = useTelaLarga();

  if (tiragem.tipo === 'abertura' && tiragem.montes) {
    return (
      <div className="cg-mesa rounded-2xl p-3 sm:p-5" data-testid="mesa-abertura">
        <Estrelas />
        <TituloMesa>Jogo de abertura — 3 montes de 7 cartas</TituloMesa>
        <div className="space-y-3">
          {tiragem.montes.map((m, mi) => {
            const base = mi * 7;
            return (
              <div key={m.posicao} className="rounded-xl border border-[#d4a937]/25 bg-black/35 p-2 sm:p-3" data-testid={`abertura-monte-${m.posicao}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5d67a]/90 mb-1">{m.posicao}º monte</p>
                <Sete cartas={m.cartas} reveladas={Math.max(0, reveladas - base)} onCarta={onCarta} tamanho="md" atrasoBase={base * 40} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tiragem.tipo === 'cruz' && tiragem.montes) {
    return (
      <div className="cg-mesa rounded-2xl p-3 sm:p-5" data-testid="mesa-cruz">
        <Estrelas />
        <TituloMesa>Jogo da cruz — 5 montes de 7 cartas</TituloMesa>
        <div className={larga ? 'grid grid-cols-3 gap-3' : 'space-y-3'}>
          {tiragem.montes.map((m, mi) => {
            const pos = CRUZ_LAYOUT[m.posicao];
            const base = mi * 7;
            return (
              <div key={m.posicao} className="rounded-xl border border-[#d4a937]/30 bg-black/40 p-2" style={larga ? { gridRow: pos.linha, gridColumn: pos.coluna } : undefined} data-testid={`monte-${m.posicao}`}>
                <p className="text-[10px] sm:text-[11px] font-black text-[#f5d67a] uppercase tracking-[0.15em] leading-tight mb-1">{m.posicao}. {m.nome}</p>
                <Sete cartas={m.cartas} reveladas={Math.max(0, reveladas - base)} onCarta={onCarta} tamanho="sm" atrasoBase={base * 30} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="cg-mesa rounded-2xl p-3 sm:p-5" data-testid={tiragem.tipo === 'pergunta' ? 'mesa-pergunta' : 'mesa-abertura'}>
      <Estrelas />
      <TituloMesa>{tiragem.tipo === 'pergunta' ? `Pergunta ${indicePergunta ?? ''}` : 'Jogo de abertura — 7 cartas'}</TituloMesa>
      {tiragem.pergunta && <p className="text-sm text-slate-100 mb-1 italic">“{tiragem.pergunta}”{tiragem.outraPessoa ? <span className="not-italic text-pink-300"> · com {tiragem.outraPessoa.fullName}</span> : null}</p>}
      {tiragem.cartas && <Sete cartas={tiragem.cartas} reveladas={reveladas} onCarta={onCarta} />}
      <p className="mt-2 text-[10px] text-center text-slate-500">toque numa carta para ver a arte grande</p>
    </div>
  );
}

const ROTULO_RE = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L} ]{1,32}):\s+/u;

/** A fala do Cigano em parágrafos, com o rótulo ("Resumo:", "Conselho:"…) em destaque dourado. */
export function TextoComRotulos({ texto }: { texto: string }) {
  const pars = texto.split(/\n{2,}|\n(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L} ]{1,32}:\s)/u).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {pars.map((p, i) => {
        const m = p.match(ROTULO_RE);
        return (
          <p key={i} className="cg-fala" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            {m ? <><span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#f5d67a] mb-0.5">✧ {m[1]}</span>{p.slice(m[0].length)}</> : p}
          </p>
        );
      })}
    </div>
  );
}

const GRUPO_ESTILO: Record<string, { cor: string; icone: string }> = {
  'Essência': { cor: 'text-[#f5d67a]', icone: '☀' },
  'Alma e caminho': { cor: 'text-emerald-300', icone: '✦' },
  'Amor e dinheiro': { cor: 'text-pink-300', icone: '♥' },
  'Forças espirituais': { cor: 'text-sky-300', icone: '☽' },
  'Momento atual': { cor: 'text-amber-300', icone: '⌛' },
  'Sorte e proteção': { cor: 'text-violet-300', icone: '✧' },
};

// "\uFE0E" pede o símbolo desenhado como letra dourada, não como emoji colorido.
const SIGNO_SIMBOLO: Record<string, string> = {
  'Áries': '♈\uFE0E', 'Touro': '♉\uFE0E', 'Gêmeos': '♊\uFE0E', 'Câncer': '♋\uFE0E', 'Leão': '♌\uFE0E', 'Virgem': '♍\uFE0E',
  'Libra': '♎\uFE0E', 'Escorpião': '♏\uFE0E', 'Sagitário': '♐\uFE0E', 'Capricórnio': '♑\uFE0E', 'Aquário': '♒\uFE0E', 'Peixes': '♓\uFE0E',
};

/**
 * Retrato natal: o Cigano já leu o mapa inteiro e explica quem a pessoa é, o que veio viver,
 * onde a vida está desalinhada e como alinhar — em português simples. Os nomes técnicos
 * (números, odù, cabala, búzios) ficam guardados em "Ver o mapa técnico", para o tarólogo.
 */
export function MapaNatalPainel({ nome, nascimento, hora, itens, retrato, lendo, onPedirRetrato }: { nome: string; nascimento: string; hora?: string | null; itens: ItemMapa[]; retrato?: string; lendo?: boolean; onPedirRetrato?: () => void }) {
  const [aberto, setAberto] = useState(true);
  const [tecnico, setTecnico] = useState(false);
  const [y, m, d] = nascimento.split('-');
  const grupos: string[] = [];
  for (const it of itens) if (!grupos.includes(it.grupo)) grupos.push(it.grupo);
  const signo = itens.find((i) => i.rotulo === 'Signo solar')?.valor || '';
  const simbolo = SIGNO_SIMBOLO[signo] || '✦';
  const copiar = () => retrato?.trim()
    ? textoDoBloco({ dados: { fullName: nome, birthDate: nascimento, birthTime: hora }, titulo: 'Seu retrato natal — quem você é', fala: retrato })
    : textoDoMapa({ fullName: nome, birthDate: nascimento, birthTime: hora }, itens);
  return (
    <section className="cg-retrato rounded-2xl p-4 sm:p-6" data-testid="mapa-natal">
      <Estrelas />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setAberto((v) => !v)} className="min-w-0 flex-1 flex items-center gap-3 text-left cursor-pointer">
          <span className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px]">
            <span className="cg-selo absolute inset-0 rounded-full" aria-hidden="true" />
            <span className="relative flex w-full h-full items-center justify-center rounded-full bg-[#120607] text-2xl sm:text-3xl text-[#f5d67a]" aria-hidden="true">{simbolo}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.3em] font-black text-[#d4a937]">Retrato natal</span>
            <span className="block text-xl sm:text-2xl font-black leading-tight cg-ouro-vivo">{nome}</span>
            <span className="block text-xs text-slate-400 mt-0.5">{d}/{m}/{y}{hora ? ` · ${hora}` : ''}{signo ? ` · ${signo}` : ''} · {aberto ? 'tocar para recolher' : 'tocar para ver'}</span>
          </span>
        </button>
        <BotaoCopiar testId="copiar-mapa" rotulo="Copiar retrato" texto={copiar} />
      </div>
      {aberto && (
        <div className="mt-4">
          {retrato?.trim() ? (
            <div className="text-[15px] leading-relaxed text-slate-100" data-testid="retrato-cigano">
              <TextoComRotulos texto={retrato} />
              {lendo && <span className="inline-block w-2 h-4 bg-[#d4a937] ml-1 animate-pulse align-middle" />}
            </div>
          ) : (
            <div className="space-y-2" data-testid="retrato-lendo">
              <p className="text-sm text-[#f5d67a]">{lendo === false ? 'O retrato aparece aqui quando o Cigano ler o mapa.' : 'O Cigano está lendo o mapa inteiro de ' + primeiroNome(nome) + '…'}</p>
              {lendo === false && onPedirRetrato && (
                <button type="button" onClick={onPedirRetrato} data-testid="pedir-retrato" className="px-4 py-2 rounded-full bg-gradient-to-r from-[#b8892a] via-[#f5d67a] to-[#b8892a] text-black text-sm font-black cursor-pointer shadow-[0_0_22px_-6px_rgba(245,214,122,0.9)]">✦ Ler o retrato de {primeiroNome(nome)}</button>
              )}
              {lendo !== false && [92, 78, 85].map((w, i) => <span key={i} className="block h-3 rounded-full cg-lendo" style={{ width: `${w}%` }} />)}
            </div>
          )}
          {itens.length > 0 && (
            <div className="mt-4 border-t border-[#d4a937]/20 pt-3">
              <button type="button" onClick={() => setTecnico((v) => !v)} data-testid="mapa-tecnico-botao" className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 hover:text-[#f5d67a] cursor-pointer">
                {tecnico ? '▾ Esconder o mapa técnico' : '▸ Ver o mapa técnico (para o tarólogo)'}
              </button>
              {tecnico && (
                <div className="mt-3 space-y-4" data-testid="mapa-tecnico">
                  {grupos.map((g) => {
                    const est = GRUPO_ESTILO[g] || { cor: 'text-slate-300', icone: '•' };
                    return (
                      <div key={g} data-testid={`mapa-grupo-${g}`}>
                        <p className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${est.cor}`}><span aria-hidden="true">{est.icone}</span> {g}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {itens.filter((i) => i.grupo === g).map((it) => (
                            <div key={`${it.grupo}-${it.rotulo}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                              <p className="flex items-baseline justify-between gap-2">
                                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{it.rotulo}</span>
                                <span className="text-sm font-black text-white text-right">{it.valor}</span>
                              </p>
                              {it.detalhe && <p className="text-[13px] text-slate-200 leading-snug mt-1">{it.detalhe}</p>}
                              {it.sombra && <p className="text-[12px] text-pink-200/90 leading-snug mt-1"><b className="text-pink-300">Cuidado:</b> {it.sombra}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Detalhe de uma carta tocada: a imagem grande e a tradução completa. */
export function DetalheCarta({ carta, onClose }: { carta: CartaCigano; onClose: () => void }) {
  const linha = (rotulo: string, texto: string | undefined, cor: string) => texto ? <p className="text-slate-200 leading-snug"><b className={cor}>{rotulo}:</b> {texto}</p> : null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-3 sm:p-4" onClick={onClose} role="dialog" aria-modal="true" data-testid="detalhe-carta">
      <div className="cg-mesa cg-fala max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="self-center sm:self-start shrink-0"><CartaVisual carta={carta} revelada tamanho="lg" /></div>
        <div className="min-w-0 text-sm space-y-2">
          <div>
            <p className="text-lg font-black leading-tight cg-ouro-vivo">{carta.romano ? `${carta.romano} — ` : ''}{carta.nome}</p>
            {carta.tradicional && <p className="text-xs text-slate-400">No tarô tradicional: {carta.tradicional}</p>}
            {carta.entidade && <p className="text-xs text-sky-300 mt-0.5">Rege: {carta.entidade}</p>}
          </div>
          {carta.minhaLeitura && <p className="text-pink-200 leading-snug"><b>Minha leitura:</b> {carta.minhaLeitura}</p>}
          {linha('Tradução', carta.traducao, 'text-[#f5d67a]')}
          {linha('Significado', carta.significado, 'text-slate-300')}
          {linha('Luz', carta.luz, 'text-emerald-300')}
          {linha('Sombra', carta.sombra, 'text-pink-300')}
          {linha('Ensinamento', carta.ensinamento, 'text-violet-300')}
          {linha('Conselho', carta.conselho, 'text-[#f5d67a]')}
          {linha('Alerta', carta.alerta, 'text-amber-300')}
          <button type="button" onClick={onClose} className="mt-1 text-xs text-slate-400 underline cursor-pointer">fechar</button>
        </div>
      </div>
    </div>
  );
}
