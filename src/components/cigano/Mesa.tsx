import React, { useEffect, useState } from 'react';
import { CartaVisual } from './CartaVisual.js';
import { CRUZ_LAYOUT, GRUPOS_DE_SETE, type CartaCigano, type Tiragem } from '../../cigano/metodo.js';
import type { ItemMapa } from '../../cigano/client/api.js';

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
    <div className="flex flex-wrap items-end gap-3 sm:gap-4">
      {GRUPOS_DE_SETE.map((g, gi) => (
        <div key={gi} className="flex flex-col items-center gap-1.5">
          <div className="flex gap-1.5 sm:gap-2">
            {g.cartas.map((i) => (
              <CartaVisual key={i} carta={cartas[i]} revelada={i < reveladas} tamanho={tamanho} ordem={i + 1} coringa={i === 6} onClick={() => i < reveladas && onCarta?.(cartas[i])} />
            ))}
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${gi === 2 ? 'text-pink-400' : 'text-[#d4a937]'}`}>{gi === 0 ? '1ª resposta' : gi === 1 ? '2ª resposta' : 'coringa'}</span>
        </div>
      ))}
    </div>
  );
}

export function MesaTiragem({ tiragem, animar, onCarta, indicePergunta }: { tiragem: Tiragem; animar: boolean; onCarta?: (c: CartaCigano) => void; indicePergunta?: number }) {
  const total = tiragem.tipo === 'cruz' ? 35 : 7;
  const reveladas = useRevelar(total, animar, tiragem.tipo === 'cruz' ? 160 : 650);

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

const GRUPO_COR: Record<string, string> = {
  Astrologia: 'text-[#f5d67a]', Numerologia: 'text-emerald-300', Cabala: 'text-sky-300', 'Odù': 'text-pink-300', 'Búzios': 'text-amber-300',
};

/** Painel do mapa natal (fica em cima, como na mesa do Cigano). */
export function MapaNatalPainel({ nome, nascimento, hora, itens }: { nome: string; nascimento: string; hora?: string | null; itens: ItemMapa[] }) {
  const [aberto, setAberto] = useState(true);
  const [y, m, d] = nascimento.split('-');
  return (
    <section className="rounded-2xl border border-[#d4a937]/50 bg-gradient-to-b from-[#1a0b0c] to-black p-3 sm:p-4" data-testid="mapa-natal">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center justify-between gap-2 text-left cursor-pointer">
        <span>
          <span className="block text-[10px] uppercase tracking-[0.25em] font-black text-[#d4a937]">Dados natais</span>
          <span className="block text-base sm:text-lg font-bold text-white">{nome}</span>
          <span className="block text-xs text-slate-400">{d}/{m}/{y}{hora ? ` · ${hora}` : ' · hora não informada'}</span>
        </span>
        <span className="text-xs text-slate-400">{aberto ? 'recolher' : 'ver mapa'}</span>
      </button>
      {aberto && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {itens.map((it) => (
            <div key={`${it.grupo}-${it.rotulo}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-2" title={it.detalhe || ''}>
              <p className={`text-[9px] uppercase tracking-wider font-bold ${GRUPO_COR[it.grupo] || 'text-slate-300'}`}>{it.grupo} · {it.rotulo}</p>
              <p className="text-sm font-semibold text-white leading-tight mt-0.5">{it.valor}</p>
              {it.detalhe && <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{it.detalhe}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Detalhe de uma carta tocada. */
export function DetalheCarta({ carta, onClose }: { carta: CartaCigano; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="max-w-sm w-full rounded-2xl border border-[#d4a937]/50 bg-[#0b0607] p-4 flex gap-4" onClick={(e) => e.stopPropagation()}>
        <CartaVisual carta={carta} revelada tamanho="lg" />
        <div className="min-w-0 text-sm space-y-1.5">
          <p className="font-bold text-[#f5d67a]">{carta.romano ? `${carta.romano} — ` : ''}{carta.nome}</p>
          {carta.minhaLeitura && <p className="text-pink-200"><b>Minha leitura:</b> {carta.minhaLeitura}</p>}
          <p className="text-slate-200"><b className="text-emerald-300">Luz:</b> {carta.luz}</p>
          {carta.sombra && <p className="text-slate-300"><b className="text-pink-300">Sombra:</b> {carta.sombra}</p>}
          <p className="text-slate-300"><b className="text-[#f5d67a]">Conselho:</b> {carta.conselho}</p>
          <button type="button" onClick={onClose} className="mt-2 text-xs text-slate-400 underline cursor-pointer">fechar</button>
        </div>
      </div>
    </div>
  );
}
