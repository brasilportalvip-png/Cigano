import React, { useState } from 'react';
import { SACRED_SPREADS, ALL_CARDS } from '../data/tarotCards';
import { TarotSpread, DrawnCard, TarotCard, SavedReading } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { CardDetailModal } from './CardDetailModal';
import { playShuffleSound, playOracleChime } from '../utils/audio';
import { Sparkles, Shuffle, Eye, Bookmark, Send, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const ALTAR_BG = '/src/assets/images/tarot_celestial_altar_1793892179010.jpg';

interface SpreadBoardProps {
  onSaveReading: (reading: SavedReading) => void;
  onOpenJournal: () => void;
}

export const SpreadBoard: React.FC<SpreadBoardProps> = ({
  onSaveReading,
  onOpenJournal,
}) => {
  const [selectedSpread, setSelectedSpread] = useState<TarotSpread>(SACRED_SPREADS[1]); // Default 3 cards
  const [question, setQuestion] = useState<string>('');
  const [querentNotes, setQuerentNotes] = useState<string>('');
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [selectedDetailCard, setSelectedDetailCard] = useState<{ card: TarotCard; isUpright: boolean } | null>(null);

  // Oracle AI State
  const [isConsultingOracle, setIsConsultingOracle] = useState<boolean>(false);
  const [oracleReading, setOracleReading] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Suggested questions
  const SUGGESTED_INTENTIONS = [
    'Qual energia o universo me convida a despertar hoje?',
    'Como harmonizar meus caminhos profissionais e financeiros?',
    'Qual é o aprendizado mais profundo das minhas relações atuais?',
    'O que devo deixar para trás para alcançar minha paz interior?',
  ];

  // Deal ritual
  const handleDealCards = () => {
    setIsShuffling(true);
    playShuffleSound();
    setOracleReading(null);
    setSavedSuccess(false);

    setTimeout(() => {
      // Shuffle full deck
      const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
      const dealt: DrawnCard[] = [];

      for (let i = 0; i < selectedSpread.cardCount; i++) {
        const card = shuffled[i];
        // 75% upright, 25% reversed for realistic rich tarot balance
        const isUpright = Math.random() > 0.25;
        dealt.push({
          card,
          isUpright,
          position: selectedSpread.positions[i],
          revealed: false,
        });
      }

      setDrawnCards(dealt);
      setIsShuffling(false);
    }, 600);
  };

  const handleFlipCard = (index: number) => {
    setDrawnCards((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, revealed: true } : c))
    );
  };

  const handleRevealAll = () => {
    setDrawnCards((prev) => prev.map((c) => ({ ...c, revealed: true })));
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#fbbf24', '#e0e7ff'],
      });
    } catch {
      // Ignore
    }
  };

  const allRevealed = drawnCards.length > 0 && drawnCards.every((c) => c.revealed);

  // Consult Oracle API
  const handleConsultOracle = async () => {
    if (!allRevealed) {
      handleRevealAll();
    }

    setIsConsultingOracle(true);
    setOracleReading(null);

    try {
      const payload = {
        spreadName: selectedSpread.name,
        question: question.trim() || undefined,
        querentContext: querentNotes.trim() || undefined,
        cards: drawnCards.map((c) => ({
          name: c.card.name,
          englishName: c.card.englishName,
          upright: c.isUpright,
          position: c.position.title,
          keywords: (c.isUpright ? c.card.keywords : c.card.reversedKeywords).join(', '),
          uprightMeaning: c.card.uprightMeaning,
          reversedMeaning: c.card.reversedMeaning,
          element: c.card.element,
        })),
      };

      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.reading) {
        setOracleReading(data.reading);
        playOracleChime();
      }
    } catch (err) {
      console.error('Error fetching oracle reading:', err);
    } finally {
      setIsConsultingOracle(false);
    }
  };

  const handleSaveToGrimoire = () => {
    if (drawnCards.length === 0) return;

    const newReading: SavedReading = {
      id: `reading-${Date.now()}`,
      timestamp: new Date().toISOString(),
      spreadId: selectedSpread.id,
      spreadName: selectedSpread.name,
      question: question || 'Consulta Geral ao Reino',
      notes: querentNotes,
      cards: drawnCards.map((c) => ({
        id: c.card.id,
        name: c.card.name,
        isUpright: c.isUpright,
        positionTitle: c.position.title,
      })),
      oracleInterpretation: oracleReading || undefined,
    };

    onSaveReading(newReading);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Hero Altar Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl min-h-[220px] flex items-center">
        <img
          src={ALTAR_BG}
          alt="Altar Sagrado do Tarot"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-60 saturate-120"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

        <div className="relative z-10 p-6 md:p-8 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300 uppercase tracking-widest mb-2">
            <span>O Reino Encantado</span>
            <span>·</span>
            <span>Altar Sagrado</span>
          </div>
          <h1 className="font-cinzel text-2xl md:text-4xl font-extrabold text-amber-100 tracking-wide text-balance leading-tight">
            Magia do Tarot
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed font-serif">
            Abaixe os véus da ilusão e consulte as cartas ancestrais. Escolha sua tiragem sagrada, concentre sua intenção e receba os conselhos celestiais dos 78 arcanos.
          </p>
        </div>
      </div>

      {/* Step 1: Select Sacred Spread */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-cinzel text-lg md:text-xl font-bold text-amber-200">
              1. Escolha a Tiragem Sagrada
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada disposição canaliza diferentes portais de consciência.
            </p>
          </div>
        </div>

        {/* Spread Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {SACRED_SPREADS.map((spread) => {
            const isSelected = selectedSpread.id === spread.id;
            return (
              <button
                key={spread.id}
                onClick={() => {
                  setSelectedSpread(spread);
                  setDrawnCards([]);
                  setOracleReading(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400/80 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-amber-400 font-bold">
                      {spread.cardCount} {spread.cardCount === 1 ? 'Carta' : 'Cartas'}
                    </span>
                    <span className="text-slate-400 text-[10px]">{spread.difficulty}</span>
                  </div>
                  <h3 className="font-cinzel font-bold text-sm text-slate-100 line-clamp-1">
                    {spread.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {spread.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Intention & Question Prompt */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="font-cinzel text-lg md:text-xl font-bold text-amber-200 flex items-center gap-2">
            <span>2. Sua Pergunta ou Intenção Sagrada</span>
            <span className="text-xs font-mono font-normal text-slate-400">(Opcional)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quanto mais sincero e focado o seu coração, mais límpida será a resposta do oráculo.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual orientação o universo me traz sobre este momento profissional?"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Quick intentions chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 text-[11px]">Inspirações:</span>
            {SUGGESTED_INTENTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => setQuestion(sug)}
                className="text-[11px] text-slate-300 hover:text-amber-200 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Action: Embaralhar e Tirar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            <span>Tiragem Ativa: </span>
            <strong className="text-amber-300">{selectedSpread.name}</strong> ({selectedSpread.cardCount} cartas)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDealCards}
              disabled={isShuffling}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{drawnCards.length === 0 ? 'Embaralhar & Tirar Cartas' : 'Tirar Novamente'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Altar Layout & Drawn Cards */}
      {drawnCards.length > 0 && (
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                Mesa Sagrada
              </span>
              <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-amber-100">
                {selectedSpread.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {allRevealed
                  ? 'Todas as cartas estão reveladas. Clique em qualquer arcano para ler detalhes ou consulte o Oráculo.'
                  : 'Clique nas cartas viradas para revelá-las uma a uma ou use o botão para desvelar o jogo.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!allRevealed && (
                <button
                  onClick={handleRevealAll}
                  className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Revelar Todas</span>
                </button>
              )}

              <button
                onClick={handleDealCards}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                title="Novo embaralhamento"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards Display Grid */}
          <div
            className={`grid gap-6 py-4 justify-items-center ${
              drawnCards.length === 1
                ? 'grid-cols-1 max-w-xs mx-auto'
                : drawnCards.length === 3
                ? 'grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto'
                : drawnCards.length === 5
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            }`}
          >
            {drawnCards.map((item, index) => (
              <div key={`${item.card.id}-${index}`} className="flex flex-col items-center">
                <TarotCardView
                  card={item.card}
                  isUpright={item.isUpright}
                  isRevealed={item.revealed}
                  onFlip={() => handleFlipCard(index)}
                  onClickDetail={() => setSelectedDetailCard({ card: item.card, isUpright: item.isUpright })}
                  positionLabel={item.position.title}
                  size={drawnCards.length > 5 ? 'sm' : 'md'}
                />
                {item.revealed && (
                  <p className="text-[11px] text-slate-400 text-center mt-2 max-w-[160px] line-clamp-2">
                    {item.position.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Actions & Oracle Button */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveToGrimoire}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-200 text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Salvar no Grimório</span>
              </button>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 animate-fade-in font-medium">
                  ✓ Tiragem guardada com sucesso!
                </span>
              )}
            </div>

            <button
              onClick={handleConsultOracle}
              disabled={isConsultingOracle}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isConsultingOracle ? 'animate-spin' : ''}`} />
              <span>
                {isConsultingOracle
                  ? 'Ouvindo os Ecos Celestes...'
                  : 'Consultar o Oráculo dos Arcanos'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Oracle Interpretation Display */}
      {isConsultingOracle && (
        <div className="p-8 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-center space-y-4 animate-pulse">
          <div className="w-14 h-14 rounded-full border-2 border-amber-400/60 border-t-transparent animate-spin mx-auto" />
          <h4 className="font-cinzel text-xl font-bold text-amber-200">
            Canalizando a Sabedoria Sagrada do Reino...
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Os arcanos estão alinhando as mensagens dos quatro elementos com a sua questão. Respire profundamente e acolha a revelação.
          </p>
        </div>
      )}

      {oracleReading && !isConsultingOracle && (
        <div className="bg-slate-950/95 border-2 border-amber-500/40 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                  Voz Ancestral
                </span>
                <h3 className="font-cinzel text-xl md:text-2xl font-bold text-amber-100">
                  A Profecia do Oráculo
                </h3>
              </div>
            </div>

            <button
              onClick={handleSaveToGrimoire}
              className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-medium flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Guardar com a Interpretação</span>
            </button>
          </div>

          {/* Formatted Markdown Reading */}
          <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed space-y-4">
            {oracleReading.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('###')) {
                return (
                  <h4
                    key={idx}
                    className="font-cinzel text-base md:text-lg font-bold text-amber-300 pt-3 border-t border-slate-800/80 first:border-none first:pt-0"
                  >
                    {paragraph.replace(/^###\s*/, '')}
                  </h4>
                );
              }
              if (paragraph.startsWith('**') && paragraph.includes(':')) {
                return (
                  <p key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-200 font-semibold">{paragraph}</span>
                  </p>
                );
              }
              return (
                <p key={idx} className="text-slate-300 font-serif">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Personal reflections notes field */}
          <div className="pt-6 border-t border-slate-800 space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Suas Notas & Sentimentos Pessoais para este Oráculo:</span>
            </label>
            <textarea
              rows={2}
              value={querentNotes}
              onChange={(e) => setQuerentNotes(e.target.value)}
              placeholder="Escreva como essa revelação ressoou em seu coração..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <CardDetailModal
        card={selectedDetailCard?.card || null}
        isUpright={selectedDetailCard?.isUpright}
        onClose={() => setSelectedDetailCard(null)}
      />
    </div>
  );
};
