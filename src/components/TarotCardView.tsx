import React from 'react';
import { TarotCard } from '../types/tarot';
import { Flame, Droplet, Wind, Mountain, Sparkles, RotateCcw } from 'lucide-react';
import { playCardRevealSound } from '../utils/audio';

const CARD_BACK_IMAGE = '/src/assets/images/tarot_mystic_card_back_1793892162118.jpg';

interface TarotCardViewProps {
  card: TarotCard;
  isUpright?: boolean;
  isRevealed?: boolean;
  onFlip?: () => void;
  onClickDetail?: () => void;
  size?: 'sm' | 'md' | 'lg';
  positionLabel?: string;
  showInversionBadge?: boolean;
}

export const TarotCardView: React.FC<TarotCardViewProps> = ({
  card,
  isUpright = true,
  isRevealed = true,
  onFlip,
  onClickDetail,
  size = 'md',
  positionLabel,
  showInversionBadge = true,
}) => {
  const getElementIcon = (elem: string) => {
    switch (elem) {
      case 'fogo':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'água':
        return <Droplet className="w-3.5 h-3.5 text-blue-400" />;
      case 'ar':
        return <Wind className="w-3.5 h-3.5 text-cyan-300" />;
      case 'terra':
        return <Mountain className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-300" />;
    }
  };

  const sizeClasses = {
    sm: 'w-28 h-44 text-[10px]',
    md: 'w-36 h-56 sm:w-44 sm:h-68 text-xs',
    lg: 'w-52 h-80 sm:w-60 sm:h-96 text-sm',
  };

  const handleCardClick = () => {
    if (!isRevealed && onFlip) {
      playCardRevealSound();
      onFlip();
    } else if (onClickDetail) {
      onClickDetail();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {positionLabel && (
        <span className="text-[11px] font-medium tracking-wide text-amber-300/80 mb-1.5 uppercase text-center line-clamp-1 max-w-[170px]">
          {positionLabel}
        </span>
      )}

      <div
        onClick={handleCardClick}
        className={`relative ${sizeClasses[size]} cursor-pointer perspective-1000 select-none group transition-transform hover:-translate-y-1 duration-200`}
      >
        <div
          className={`w-full h-full duration-700 transform-style-3d relative rounded-xl shadow-2xl transition-transform ${
            isRevealed ? '' : 'rotate-y-180'
          }`}
        >
          {/* FRONT OF CARD (FACE UP) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-xl overflow-hidden backface-hidden border-2 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-2.5 flex flex-col justify-between shadow-lg shadow-black/80 ${
              card.suit === 'major'
                ? 'border-amber-400/80 ring-1 ring-amber-400/30'
                : 'border-slate-600/60 ring-1 ring-slate-700/30'
            }`}
            style={{
              boxShadow: `0 8px 30px -5px ${card.colorScheme.glow}`,
            }}
          >
            {/* Top Ornamental Bar */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1">
              <span className="font-serif font-bold text-amber-300 text-xs tracking-widest">
                {card.romanNumeral ?? (card.number > 0 ? `#${card.number}` : '')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">{card.astrology}</span>
                {getElementIcon(card.element)}
              </div>
            </div>

            {/* Center Mystical Illustration Art Box */}
            <div
              className={`relative my-1 flex-1 rounded-lg border border-amber-500/20 bg-slate-900/60 flex flex-col items-center justify-center p-3 text-center overflow-hidden transition-transform duration-500 ${
                !isUpright ? 'rotate-180' : ''
              }`}
            >
              {/* Ethereal Sacred Geometry Background in Card Center */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at center, ${card.colorScheme.primary} 15%, transparent 70%)`,
                }}
              />

              {/* Archetype Icon & Sacred Frame */}
              <div
                className="w-12 h-12 rounded-full border border-amber-400/40 flex items-center justify-center mb-2 shadow-inner"
                style={{ backgroundColor: `${card.colorScheme.primary}20` }}
              >
                <Sparkles
                  className="w-6 h-6"
                  style={{ color: card.colorScheme.primary }}
                />
              </div>

              <h4 className="font-cinzel font-bold text-amber-100 text-xs sm:text-sm tracking-wide leading-tight px-1">
                {card.name}
              </h4>
              <span className="text-[9px] text-amber-300/70 italic mt-0.5 font-serif">
                {card.englishName}
              </span>

              {/* Micro Keywords */}
              <div className="mt-2 text-[9px] text-slate-300/80 line-clamp-2 px-1">
                {(isUpright ? card.keywords : card.reversedKeywords).slice(0, 3).join(' · ')}
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="border-t border-amber-500/20 pt-1 flex items-center justify-between text-[9px]">
              <span className="capitalize text-slate-400 font-medium tracking-wider">
                {card.suit === 'major' ? 'Arcano Maior' : `Naipe de ${card.suit}`}
              </span>

              {showInversionBadge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider flex items-center gap-0.5 ${
                    isUpright
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-600/40'
                  }`}
                >
                  {!isUpright && <RotateCcw className="w-2.5 h-2.5" />}
                  {isUpright ? 'Luz / Direta' : 'Sombra / Invertida'}
                </span>
              )}
            </div>
          </div>

          {/* BACK OF CARD (FACE DOWN) */}
          <div
            className="absolute inset-0 w-full h-full rounded-xl overflow-hidden backface-hidden rotate-y-180 border-2 border-amber-500/40 shadow-xl bg-slate-950 group-hover:ring-2 group-hover:ring-amber-400/50 transition-all"
          >
            {/* Real generated high-res card back image with styled CSS fallback */}
            <img
              src={CARD_BACK_IMAGE}
              alt="Verso Sagrado do Tarot"
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback styled ornate frame if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback frame layer underneath */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-slate-950 to-blue-950 flex flex-col items-center justify-center p-4 border border-amber-400/30">
              <div className="w-16 h-16 rounded-full border border-amber-400/50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
              </div>
              <span className="text-[10px] font-cinzel text-amber-200 mt-2 tracking-widest text-center">
                REINO ENCANTADO
              </span>
            </div>

            {/* Click to flip prompt on back */}
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
              <span className="px-2.5 py-1 rounded bg-black/80 text-amber-200 text-[10px] font-medium border border-amber-400/40 shadow-lg">
                Revelar Arcano
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
