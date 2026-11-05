import React from 'react';
import { Volume2, VolumeX, Sparkles, Moon } from 'lucide-react';
import { toggleAmbientSound, getAudioState } from '../utils/audio';

export type TabType = 'tiragens' | 'grimorio' | 'diario' | 'lunar';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  savedCount: number;
  currentMoonEmoji: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  currentMoonEmoji,
}) => {
  const [soundOn, setSoundOn] = React.useState<boolean>(false);

  const handleSoundToggle = () => {
    const next = toggleAmbientSound();
    setSoundOn(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-amber-500/20 px-4 md:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark */}
        <button
          onClick={() => setActiveTab('tiragens')}
          className="text-left group flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <span className="font-cinzel text-lg md:text-xl font-bold tracking-wider text-amber-200 group-hover:text-amber-100 transition-colors">
              Magia do Tarot
            </span>
          </div>
        </button>

        {/* Zone 2: 4-5 single-line clean navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('tiragens')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'tiragens'
                ? 'border-amber-400 text-amber-200 font-semibold'
                : 'border-transparent text-slate-300 hover:text-amber-300'
            }`}
          >
            Tiragens Sagradas
          </button>

          <button
            onClick={() => setActiveTab('grimorio')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'grimorio'
                ? 'border-amber-400 text-amber-200 font-semibold'
                : 'border-transparent text-slate-300 hover:text-amber-300'
            }`}
          >
            Grimório dos Arcanos
          </button>

          <button
            onClick={() => setActiveTab('diario')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'diario'
                ? 'border-amber-400 text-amber-200 font-semibold'
                : 'border-transparent text-slate-300 hover:text-amber-300'
            }`}
          >
            <span>Diário Sagrado</span>
            {savedCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lunar')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'lunar'
                ? 'border-amber-400 text-amber-200 font-semibold'
                : 'border-transparent text-slate-300 hover:text-amber-300'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-amber-300" />
            <span>Fase Lunar</span>
            <span className="text-xs">{currentMoonEmoji}</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Audio Resonance Control) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSoundToggle}
            title={soundOn ? 'Silenciar frequências celestiais' : 'Ativar ressonância e sons místicos'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all whitespace-nowrap shrink-0 ${
              soundOn
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 shadow-sm shadow-amber-500/10'
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {soundOn ? (
              <>
                <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Ressonância Ativa</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Som Sagrado</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer strip */}
      <div className="md:hidden flex items-center justify-around pt-2.5 mt-2 border-t border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('tiragens')}
          className={`py-1 ${activeTab === 'tiragens' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}
        >
          Tiragens
        </button>
        <button
          onClick={() => setActiveTab('grimorio')}
          className={`py-1 ${activeTab === 'grimorio' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}
        >
          Grimório
        </button>
        <button
          onClick={() => setActiveTab('diario')}
          className={`py-1 ${activeTab === 'diario' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}
        >
          Diário ({savedCount})
        </button>
        <button
          onClick={() => setActiveTab('lunar')}
          className={`py-1 ${activeTab === 'lunar' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}
        >
          Lua {currentMoonEmoji}
        </button>
      </div>
    </header>
  );
};
