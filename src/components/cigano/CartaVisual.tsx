import React from 'react';
import type { CartaCigano } from '../../cigano/metodo.js';

/** Símbolos simples dos naipes (desenhados, sem imagem externa). */
function Naipe({ naipe, x, y, s = 1 }: { naipe?: string; x: number; y: number; s?: number }) {
  const t = `translate(${x} ${y}) scale(${s})`;
  if (naipe === 'copas') return <g transform={t}><path d="M-9 -10 h18 q0 12 -9 14 q-9 -2 -9 -14z" fill="#b8272d" stroke="#4a1410" strokeWidth="1.2" /><rect x="-1.5" y="4" width="3" height="7" fill="#d9a521" /><rect x="-6" y="10" width="12" height="3" rx="1" fill="#d9a521" stroke="#4a1410" strokeWidth=".8" /></g>;
  if (naipe === 'ouros') return <g transform={t}><circle r="10" fill="#e3b23c" stroke="#4a1410" strokeWidth="1.2" /><circle r="5.5" fill="none" stroke="#b8272d" strokeWidth="1.4" /><path d="M0 -3.5 L1 -1 3.5 -1 1.5 .8 2.3 3.4 0 1.8 -2.3 3.4 -1.5 .8 -3.5 -1 -1 -1z" fill="#2f5d9e" /></g>;
  if (naipe === 'espadas') return <g transform={t}><path d="M0 -13 L3 8 H-3z" fill="#9fb3c8" stroke="#22344d" strokeWidth="1" /><rect x="-8" y="7" width="16" height="3" rx="1" fill="#d9a521" stroke="#4a1410" strokeWidth=".8" /><rect x="-1.5" y="10" width="3" height="5" fill="#b8272d" /></g>;
  if (naipe === 'paus') return <g transform={t}><rect x="-2.5" y="-13" width="5" height="26" rx="2.5" fill="#6b8e3a" stroke="#2c3d16" strokeWidth="1" /><circle cx="-5" cy="-5" r="2.4" fill="#b8272d" /><circle cx="5" cy="3" r="2.4" fill="#b8272d" /></g>;
  return <g transform={t}><path d="M0 -12 L3 -3 12 -3 5 2.5 7.5 11 0 6 -7.5 11 -5 2.5 -12 -3 -3 -3z" fill="#e3b23c" stroke="#4a1410" strokeWidth="1.2" /></g>;
}

interface Props {
  carta?: CartaCigano | null;
  revelada: boolean;
  tamanho?: 'sm' | 'md' | 'lg';
  coringa?: boolean;
  ordem?: number;
  onClick?: () => void;
}

const LARGURA = { sm: 46, md: 78, lg: 110 };

/** Carta do Tarot de Marselha (desenhada): verso escuro com ouro; frente com número romano, símbolo e nome. */
export function CartaVisual({ carta, revelada, tamanho = 'md', coringa, ordem, onClick }: Props) {
  const w = LARGURA[tamanho];
  const h = Math.round(w * 1.72);
  const nome = carta?.nome || '';
  const titulo = carta?.arcano === 'maior' ? carta?.romano : carta ? (carta.numero === 1 ? 'ÁS' : carta.numero <= 10 ? String(carta.numero) : '') : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 rounded-md transition-transform duration-500 ${revelada ? '' : 'hover:-translate-y-0.5'} ${coringa ? 'ring-2 ring-pink-500/80' : ''}`}
      style={{ width: w, height: h, perspective: 600 }}
      aria-label={revelada && carta ? `${ordem ? `Carta ${ordem}: ` : ''}${nome}` : 'Carta virada'}
      data-testid="carta"
      data-revelada={revelada ? '1' : '0'}
    >
      <span className="absolute inset-0 transition-transform duration-700" style={{ transformStyle: 'preserve-3d', transform: revelada ? 'rotateY(180deg)' : 'none' }}>
        {/* verso (arte do Reino Encantado das Cartas) */}
        <img src="/image/verso-carta.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full rounded-md object-cover border border-[#d4a937]/70" style={{ backfaceVisibility: 'hidden' }} />
        {/* frente */}
        <svg viewBox="0 0 100 172" className="absolute inset-0 w-full h-full rounded-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} aria-hidden="true">
          <rect width="100" height="172" rx="6" fill="#f3e6c4" stroke="#4a1410" strokeWidth="2.5" />
          <rect x="6" y="6" width="88" height="160" rx="3" fill="none" stroke="#b8272d" strokeWidth="1.5" />
          <rect x="6" y="6" width="88" height="22" fill="#2f5d9e" opacity=".9" />
          <text x="50" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f3e6c4" fontFamily="Georgia, serif">{titulo}</text>
          {carta?.arcano === 'menor' ? (
            <>
              <Naipe naipe={carta.naipe} x={50} y={70} s={1.6} />
              {carta.numero >= 11 && <text x="50" y="112" textAnchor="middle" fontSize="11" fill="#4a1410" fontFamily="Georgia, serif">{carta.numero === 11 ? 'VALETE' : carta.numero === 12 ? 'CAVALEIRO' : carta.numero === 13 ? 'RAINHA' : 'REI'}</text>}
            </>
          ) : (
            <>
              <circle cx="50" cy="78" r="26" fill="#e3b23c" opacity=".25" />
              <Naipe x={50} y={78} s={2} />
            </>
          )}
          <rect x="6" y="138" width="88" height="28" fill="#b8272d" opacity=".92" />
          <foreignObject x="8" y="139" width="84" height="26">
            <div style={{ color: '#f3e6c4', fontSize: 9.5, lineHeight: '11px', fontFamily: 'Georgia, serif', textAlign: 'center', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '26px' }}>{nome}</div>
          </foreignObject>
        </svg>
      </span>
      {ordem != null && <span className={`absolute -top-2 -left-2 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${coringa ? 'bg-pink-500 text-white' : 'bg-[#d4a937] text-black'}`}>{ordem}</span>}
    </button>
  );
}
