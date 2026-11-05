import React from 'react';
import { TarotCard } from '../types/tarot';
import { X, Sparkles, Compass, Shield, BookOpen, Quote } from 'lucide-react';

interface CardDetailModalProps {
  card: TarotCard | null;
  isUpright?: boolean;
  onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isUpright = true,
  onClose,
}) => {
  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          aria-label="Fechar detalhes da carta"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono tracking-widest uppercase mb-1">
              <span>{card.suit === 'major' ? 'Arcano Maior' : `Naipe de ${card.suit}`}</span>
              <span>·</span>
              <span>{card.romanNumeral ?? `#${card.number}`}</span>
              <span>·</span>
              <span>{card.astrology}</span>
            </div>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-100">
              {card.name}
            </h2>
            <p className="text-sm font-serif italic text-amber-300/70">
              {card.englishName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                isUpright
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50'
                  : 'bg-rose-950/70 text-rose-300 border-rose-600/50'
              }`}
            >
              {isUpright ? 'Orientação: Na Luz (Direta)' : 'Orientação: Na Sombra (Invertida)'}
            </span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="mt-6 space-y-6 text-sm">
          {/* Dual Meanings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Significado na Luz (Direta)</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
                {card.uprightMeaning}
              </p>
              <div className="flex flex-wrap gap-1 text-[11px] text-emerald-300/80">
                {card.keywords.map((kw, i) => (
                  <span key={i} className="bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-300 font-semibold mb-2">
                <Shield className="w-4 h-4" />
                <span>Significado na Sombra (Invertida)</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
                {card.reversedMeaning}
              </p>
              <div className="flex flex-wrap gap-1 text-[11px] text-rose-300/80">
                {card.reversedKeywords.map((kw, i) => (
                  <span key={i} className="bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mythos & Symbolism */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/15">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Mitologia & Simbolismo Oculto</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {card.mythosAndLore}
            </p>
          </div>

          {/* Practical Advice */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/15">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-2">
              <Compass className="w-4 h-4" />
              <span>Conselho Prático dos Arcanos</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {card.advice}
            </p>
          </div>

          {/* Affirmation Box */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3">
            <Quote className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-300/80 font-bold block mb-1">
                Afirmação Sagrada
              </span>
              <p className="font-serif italic text-amber-100 text-sm sm:text-base">
                "{card.affirmation}"
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs tracking-wide transition-colors"
          >
            Acolher Sabedoria
          </button>
        </div>
      </div>
    </div>
  );
};
