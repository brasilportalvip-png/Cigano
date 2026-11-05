import React, { useEffect, useState } from 'react';
import { CartaVisual } from './CartaVisual.js';
import { CRUZ_LAYOUT, GRUPOS_DE_SETE, type CartaCigano, type Tiragem } from '../../cigano/metodo.js';
import type { ItemMapa } from '../../cigano/client/api.js';
import { copiarTexto, primeiroNome, textoDoMapa } from '../../cigano/copiar.js';

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

function Sete({ cartas, reveladas, tamanho = 'md', onCarta }: { cartas: CartaCigano[]; reveladas: number; tamanho?: 'sm' | 'md'; onCarta?: (c: CartaCigano) => void }) {
  return (
    <div className="flex flex-nowrap items-end gap-1.5 sm:gap-4">
      {GRUPOS_DE_SETE.map((g, gi) => (
        <div key={gi} className="flex flex-col items-center gap-1.5">
          <div className="flex gap-0.5 sm:gap-2">
            {g.cartas.map((i) => (
              <CartaVisual key={i} carta={cartas[i]} revelada={i < reveladas} tamanho={tamanho} ordem={i + 1} coringa={i === 6} onClick={() => i < reveladas && onCarta?.(cartas[i])} />
            ))}
          </div>
          <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-bold ${gi === 2 ? 'text-pink-400' : 'text-[#d4a937]'}`}>{gi === 0 ? '1ª resposta' : gi === 1 ? '2ª resposta' : 'coringa'}</span>
        </div>
      ))}
    </div>
  );
}

export function MesaTiragem({ tiragem, animar, onCarta, indicePergunta }: { tiragem: Tiragem; animar: boolean; onCarta?: (c: CartaCigano) => void; indicePergunta?: number }) {
  const total = tiragem.montes ? tiragem.montes.length * 7 : 7;
  const reveladas = useRevelar(total, animar, tiragem.tipo === 'cruz' ? 140 : tiragem.montes ? 220 : 450);

  if (tiragem.tipo === 'abertura' && tiragem.montes) {
    return (
      <div className="rounded-2xl border border-[#d4a937]/40 bg-black/50 p-3 sm:p-4" data-testid="mesa-abertura">
        <p className="text-xs font-black uppercase tracking-widest text-[#f5d67a] mb-3">Jogo de abertura — 3 montes de 7 cartas</p>
        <div className="space-y-3">
          {tiragem.montes.map((m, mi) => {
            const base = mi * 7;
            return (
              <div key={m.posicao} className="rounded-xl border border-[#d4a937]/25 bg-[#120607]/70 p-2 sm:p-3" data-testid={`abertura-monte-${m.posicao}`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#f5d67a] mb-2">{m.posicao}º monte</p>
                <Sete cartas={m.cartas} reveladas={Math.max(0, reveladas - base)} onCarta={onCarta} tamanho="sm" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tiragem.tipo === 'cruz' && tiragem.montes) {
    return (
      <div className="rounded-2xl border border-[#d4a937]/40 bg-black/50 p-3 sm:p-4" data-testid="mesa-cruz">
        <p className="text-xs font-black uppercase tracking-widest text-[#f5d67a] mb-3">Jogo da cruz — 5 montes de 7 cartas</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {tiragem.montes.map((m, mi) => {
            const pos = CRUZ_LAYOUT[m.posicao];
            const base = mi * 7;
            return (
              <div key={m.posicao} className="rounded-xl border border-[#d4a937]/30 bg-[#120607]/80 p-1.5 sm:p-2" style={{ gridRow: pos.linha, gridColumn: pos.coluna }} data-testid={`monte-${m.posicao}`}>
                <p className="text-[9px] sm:text-[10px] font-black text-[#f5d67a] uppercase leading-tight mb-1">{m.posicao}. {m.nome}</p>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {m.cartas.map((c, i) => (
                    <CartaVisual key={c.id} carta={c} revelada={base + i < reveladas} tamanho="sm" coringa={i === 6} onClick={() => onCarta?.(c)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#d4a937]/40 bg-black/50 p-3 sm:p-4" data-testid={tiragem.tipo === 'pergunta' ? 'mesa-pergunta' : 'mesa-abertura'}>
      <p className="text-xs font-black uppercase tracking-widest text-[#f5d67a] mb-1">
        {tiragem.tipo === 'pergunta' ? `Pergunta ${indicePergunta ?? ''}` : 'Jogo de abertura — 7 cartas'}
      </p>
      {tiragem.pergunta && <p className="text-sm text-slate-200 mb-2">“{tiragem.pergunta}”{tiragem.outraPessoa ? <span className="text-pink-300"> · com {tiragem.outraPessoa.fullName}</span> : null}</p>}
      {tiragem.cartas && <Sete cartas={tiragem.cartas} reveladas={reveladas} onCarta={onCarta} />}
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

/** Retrato natal (fica em cima, como na mesa do Cigano): grande, completo e por assunto. */
export function MapaNatalPainel({ nome, nascimento, hora, itens }: { nome: string; nascimento: string; hora?: string | null; itens: ItemMapa[] }) {
  const [aberto, setAberto] = useState(true);
  const [y, m, d] = nascimento.split('-');
  const grupos: string[] = [];
  for (const it of itens) if (!grupos.includes(it.grupo)) grupos.push(it.grupo);
  const destaque = (r: string) => itens.find((i) => i.rotulo === r)?.valor || '—';
  return (
    <section className="rounded-2xl border border-[#d4a937]/50 bg-gradient-to-b from-[#1a0b0c]/95 to-black/90 p-3 sm:p-5" data-testid="mapa-natal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={() => setAberto((v) => !v)} className="min-w-0 flex-1 text-left cursor-pointer">
          <span className="block text-[10px] uppercase tracking-[0.25em] font-black text-[#d4a937]">Retrato natal</span>
          <span className="block text-xl sm:text-2xl font-black text-white leading-tight">{nome}</span>
          <span className="block text-xs text-slate-400 mt-0.5">{d}/{m}/{y}{hora ? ` · ${hora}` : ' · hora não informada'} · {aberto ? 'tocar para recolher' : 'tocar para ver tudo'}</span>
        </button>
        <BotaoCopiar testId="copiar-mapa" rotulo="Copiar retrato" texto={() => textoDoMapa({ fullName: nome, birthDate: nascimento, birthTime: hora }, itens)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {[['Signo', 'Signo solar'], ['Caminho de vida', 'Caminho de vida'], ['Odù', 'Odù de nascimento'], ['Ano pessoal', 'Ano pessoal']].map(([t, r]) => (
          <div key={t} className="rounded-xl border border-[#d4a937]/35 bg-[#d4a937]/[0.06] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#d4a937] font-bold">{t}</p>
            <p className="text-lg font-black text-white leading-tight">{destaque(r)}</p>
          </div>
        ))}
      </div>
      {aberto && (
        <div className="mt-4 space-y-4">
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
          <p className="text-[11px] text-slate-500">Mapa de {primeiroNome(nome)}: astrologia, numerologia, cabala, odù e búzios — tudo ligado às cartas.</p>
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
      <div className="max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-[#d4a937]/50 bg-[#0b0607] p-4 sm:p-5 flex flex-col sm:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="self-center sm:self-start shrink-0"><CartaVisual carta={carta} revelada tamanho="lg" /></div>
        <div className="min-w-0 text-sm space-y-2">
          <div>
            <p className="text-lg font-black text-[#f5d67a] leading-tight">{carta.romano ? `${carta.romano} — ` : ''}{carta.nome}</p>
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
