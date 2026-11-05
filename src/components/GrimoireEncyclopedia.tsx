import React, { useState, useMemo } from 'react';
import { ALL_CARDS } from '../data/tarotCards';
import { TarotCard, CardSuit, ElementType } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { CardDetailModal } from './CardDetailModal';
import { Search, Sparkles, Flame, Droplet, Wind, Mountain, BookOpen } from 'lucide-react';

export const GrimoireEncyclopedia: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSuit, setSelectedSuit] = useState<string>('all');
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [inspectedCard, setInspectedCard] = useState<TarotCard | null>(null);

  const filteredCards = useMemo(() => {
    return ALL_CARDS.filter((card) => {
      // Suit filter
      if (selectedSuit !== 'all' && card.suit !== selectedSuit) {
        return false;
      }
      // Element filter
      if (selectedElement !== 'all' && card.element !== selectedElement) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesEn = card.englishName.toLowerCase().includes(query);
        const matchesAstro = card.astrology.toLowerCase().includes(query);
        const matchesKw = card.keywords.some((k) => k.toLowerCase().includes(query));
        const matchesRevKw = card.reversedKeywords.some((k) => k.toLowerCase().includes(query));
        if (!matchesName && !matchesEn && !matchesAstro && !matchesKw && !matchesRevKw) {
          return false;
        }
      }
      return true;
    });
  }, [searchTerm, selectedSuit, selectedElement]);

  return (
    <div className="space-y-6">
      {/* Grimoire Header */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Enciclopédia Sagrada</span>
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-amber-100">
              O Grimório dos Arcanos
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Consulte a sabedoria hermética, significados da Luz e da Sombra, correspondências astrológicas e afirmações sagradas de cada arcano.
            </p>
          </div>

          <div className="text-right text-xs text-slate-400 font-mono">
            Mostrando <span className="text-amber-300 font-bold">{filteredCards.length}</span> arcanos
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, palavra-chave, planeta ou signo..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Interactive filter tab buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 mr-1">Naipes:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'major', label: 'Arcanos Maiores' },
              { id: 'copas', label: 'Copas (Água)' },
              { id: 'paus', label: 'Paus (Fogo)' },
              { id: 'espadas', label: 'Espadas (Ar)' },
              { id: 'ouros', label: 'Ouros (Terra)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSuit(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedSuit === tab.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Element filter buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400 mr-1">Elementos:</span>
            {[
              { id: 'all', label: 'Todos os Elementos', icon: Sparkles },
              { id: 'fogo', label: 'Fogo', icon: Flame },
              { id: 'água', label: 'Água', icon: Droplet },
              { id: 'ar', label: 'Ar', icon: Wind },
              { id: 'terra', label: 'Terra', icon: Mountain },
            ].map((elem) => {
              const IconComp = elem.icon;
              return (
                <button
                  key={elem.id}
                  onClick={() => setSelectedElement(elem.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                    selectedElement === elem.id
                      ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>{elem.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-cinzel text-lg text-slate-200">Nenhum arcano encontrado</h3>
          <p className="text-xs">
            Tente outro termo de busca ou redefina os filtros elementais.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSuit('all');
              setSelectedElement('all');
            }}
            className="mt-3 px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 hover:bg-slate-800"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              onClick={() => setInspectedCard(card)}
              className="bg-slate-950/80 border border-slate-800/80 hover:border-amber-400/60 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                  <span className="text-amber-400 font-bold">
                    {card.romanNumeral ?? `#${card.number}`}
                  </span>
                  <span className="capitalize">{card.element}</span>
                </div>

                <div className="w-full aspect-[2/3] rounded-lg bg-slate-900 border border-amber-500/20 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden group-hover:border-amber-400/50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-sm"
                    style={{ backgroundColor: `${card.colorScheme.primary}25` }}
                  >
                    <Sparkles
                      className="w-4 h-4"
                      style={{ color: card.colorScheme.primary }}
                    />
                  </div>
                  <h4 className="font-cinzel font-bold text-xs text-slate-100 line-clamp-2 leading-tight">
                    {card.name}
                  </h4>
                  <span className="text-[9px] text-amber-300/70 italic mt-0.5 line-clamp-1">
                    {card.englishName}
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 line-clamp-2">
                  {card.keywords.slice(0, 2).join(' · ')}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-amber-300/80 group-hover:text-amber-200">
                <span>{card.astrology}</span>
                <span className="font-medium">Abrir →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Modal */}
      <CardDetailModal
        card={inspectedCard}
        isUpright={true}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
};
