import React from 'react';
import { getCurrentMoonPhase } from '../utils/lunar';
import { SACRED_SPREADS } from '../data/tarotCards';
import { Moon, Sparkles, Compass, Eye, ShieldAlert } from 'lucide-react';

const SANCTUARY_BG = '/src/assets/images/tarot_oracle_sanctuary_1793892163895.jpg';

interface LunarPhaseViewProps {
  onSelectSpread: (spreadId: string) => void;
}

export const LunarPhaseView: React.FC<LunarPhaseViewProps> = ({ onSelectSpread }) => {
  const lunar = getCurrentMoonPhase();

  const recommendedSpreads = SACRED_SPREADS.filter((s) =>
    lunar.recommendedSpreads.includes(s.id)
  );

  return (
    <div className="space-y-8">
      {/* Visual Sanctuary Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl min-h-[240px] flex items-center">
        <img
          src={SANCTUARY_BG}
          alt="Santuário dos Arcanos e Estrelas"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-70"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

        <div className="relative z-10 p-6 md:p-8 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300 uppercase tracking-widest mb-2">
            <span>Cosmologia & Trânsitos</span>
            <span>·</span>
            <span>O Véu das Estrelas</span>
          </div>
          <h1 className="font-cinzel text-2xl md:text-4xl font-extrabold text-amber-100 tracking-wide">
            Astrologia & Fases Lunares
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed font-serif">
            As marés lunares governam a intuição, as águas emocionais e a receptividade aos arquétipos do Tarot. Alinhe suas tiragens com os ciclos do céu.
          </p>
        </div>
      </div>

      {/* Current Moon Phase Card */}
      <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-amber-950/40 border-2 border-amber-400/50 flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/10">
              <span>{lunar.emoji}</span>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest mb-1">
                <Moon className="w-3.5 h-3.5" />
                <span>Trânsito Atual</span>
                <span>·</span>
                <span>{lunar.illumination}% Iluminada</span>
              </div>
              <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-100">
                {lunar.phaseName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg font-serif leading-relaxed">
                {lunar.tarotAdvice}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto p-4 rounded-xl bg-slate-900 border border-slate-800 text-center md:text-right shrink-0">
            <span className="text-[11px] text-slate-400 font-mono block">Sintonia Recomendada:</span>
            <span className="text-xs font-semibold text-amber-300 block mt-1">
              {lunar.illumination > 50 ? 'Revelações & Clareza Profunda' : 'Introspecção & Novos Inícios'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Spreads for this Moon Phase */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-cinzel text-lg md:text-xl font-bold text-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Tiragens em Harmonia com a {lunar.phaseName}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Estas disposições vibram em ressonância exata com a força gravitacional e mística da lua hoje.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {recommendedSpreads.map((spread) => (
            <div
              key={spread.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-amber-400 font-mono mb-1">
                  <span>{spread.cardCount} {spread.cardCount === 1 ? 'Carta' : 'Cartas'}</span>
                  <span className="text-slate-400">{spread.difficulty}</span>
                </div>
                <h4 className="font-cinzel font-bold text-base text-slate-100">
                  {spread.name}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-serif">
                  {spread.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => onSelectSpread(spread.id)}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-semibold transition-colors"
                >
                  Abrir esta Tiragem no Altar →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Moon Cycle Guide */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4">
        <h3 className="font-cinzel text-lg font-bold text-amber-200 flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>Guia dos Ciclos Lunares no Tarot</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-2xl mb-1">🌑</div>
            <h4 className="font-bold text-amber-200 mb-1">Lua Nova</h4>
            <p className="text-slate-400 leading-relaxed">
              Momento do <strong>Louco</strong> e do <strong>Mago</strong>. O solo fértil da intenção. Ideal para planejar e semear novos caminhos sem apegos.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-2xl mb-1">🌓</div>
            <h4 className="font-bold text-amber-200 mb-1">Quarto Crescente</h4>
            <p className="text-slate-400 leading-relaxed">
              Momento do <strong>Carro</strong> e da <strong>Força</strong>. Hora de superar atritos, ter disciplina e conduzir projetos com firmeza.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-2xl mb-1">🌕</div>
            <h4 className="font-bold text-amber-200 mb-1">Lua Cheia</h4>
            <p className="text-slate-400 leading-relaxed">
              Momento da <strong>Sacerdotisa</strong> e da <strong>Estrela</strong>. Intuição no ponto mais alto, sonhos vívidos e revelações completas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-2xl mb-1">🌘</div>
            <h4 className="font-bold text-amber-200 mb-1">Lua Minguante</h4>
            <p className="text-slate-400 leading-relaxed">
              Momento da <strong>Morte</strong> e do <strong>Eremita</strong>. Purificação, corte de laços desnecessários, desapego e cura interior.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
