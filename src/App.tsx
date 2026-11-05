import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SpreadBoard } from './components/SpreadBoard';
import { GrimoireEncyclopedia } from './components/GrimoireEncyclopedia';
import { JournalView } from './components/JournalView';
import { LunarPhaseView } from './components/LunarPhaseView';
import { SavedReading } from './types/tarot';
import { getCurrentMoonPhase } from './utils/lunar';
import { Sparkles } from 'lucide-react';

const STORAGE_KEY = 'magia_tarot_readings_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tiragens' | 'grimorio' | 'diario' | 'lunar'>('tiragens');
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const lunar = getCurrentMoonPhase();

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedReadings));
    } catch {
      // Ignore
    }
  }, [savedReadings]);

  const handleSaveReading = (reading: SavedReading) => {
    setSavedReadings((prev) => [reading, ...prev]);
  };

  const handleDeleteReading = (id: string) => {
    setSavedReadings((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setSavedReadings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, notes } : r))
    );
  };

  return (
    <div className="min-h-screen bg-[#050714] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedReadings.length}
        currentMoonEmoji={lunar.emoji}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {activeTab === 'tiragens' && (
          <SpreadBoard
            onSaveReading={handleSaveReading}
            onOpenJournal={() => setActiveTab('diario')}
          />
        )}

        {activeTab === 'grimorio' && <GrimoireEncyclopedia />}

        {activeTab === 'diario' && (
          <JournalView
            readings={savedReadings}
            onDeleteReading={handleDeleteReading}
            onUpdateNotes={handleUpdateNotes}
            onStartNewReading={() => setActiveTab('tiragens')}
          />
        )}

        {activeTab === 'lunar' && (
          <LunarPhaseView
            onSelectSpread={(_spreadId) => {
              setActiveTab('tiragens');
            }}
          />
        )}
      </main>

      {/* Quiet Elegant Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/70 text-slate-500 text-xs py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500/80" />
            <span className="font-cinzel text-slate-300 font-semibold tracking-wider">
              Magia do Tarot: O Reino Encantado das Cartas
            </span>
          </div>

          <p className="font-serif italic text-slate-400 text-[11px]">
            "O Tarot é o espelho sagrado da alma; nele, o destino é tecido pelas escolhas do coração."
          </p>

          <div className="text-[11px] text-slate-500">
            Tradição Hermética & Sabedoria dos Arcanos
          </div>
        </div>
      </footer>
    </div>
  );
}
