import React, { useState } from 'react';
import { SavedReading } from '../types/tarot';
import { Bookmark, Calendar, Trash2, Copy, Check, ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react';

interface JournalViewProps {
  readings: SavedReading[];
  onDeleteReading: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onStartNewReading: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  readings,
  onDeleteReading,
  onUpdateNotes,
  onStartNewReading,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(readings[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>('');

  const handleCopy = (reading: SavedReading) => {
    const text = `=== MAGIA DO TAROT: LEITURA SAGRADA ===
Data: ${new Date(reading.timestamp).toLocaleDateString('pt-BR')} ${new Date(reading.timestamp).toLocaleTimeString('pt-BR')}
Tiragem: ${reading.spreadName}
Pergunta: "${reading.question}"

CARTAS REVELADAS:
${reading.cards.map((c, i) => `${i + 1}. [${c.positionTitle}] ${c.name} (${c.isUpright ? 'Luz / Direta' : 'Sombra / Invertida'})`).join('\n')}

${reading.oracleInterpretation ? `\nINTERPRETAÇÃO DO ORÁCULO:\n${reading.oracleInterpretation}` : ''}
${reading.notes ? `\nNOTAS PESSOAIS:\n${reading.notes}` : ''}
`;

    navigator.clipboard.writeText(text);
    setCopiedId(reading.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveNotes = (id: string) => {
    onUpdateNotes(id, tempNotes);
    setEditingNotesId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest mb-1">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Memórias & Revelações</span>
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-amber-100">
              Diário Sagrado
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Guarde os oráculos passados, acompanhe a sincronicidade dos arcanos e registre a evolução de sua alma.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono">
              Total guardado:{' '}
              <strong className="text-amber-300 font-bold">{readings.length}</strong> leituras
            </span>
          </div>
        </div>
      </div>

      {/* Readings list or empty state */}
      {readings.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-cinzel text-xl text-slate-200">
            Seu Diário Místico está em branco
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ao realizar uma tiragem no Altar Sagrado, clique em <strong>"Salvar no Grimório"</strong> para registrar as cartas, a profecia do oráculo e suas notas reflexivas.
          </p>
          <button
            onClick={onStartNewReading}
            className="mt-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Fazer Primeira Tiragem</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {readings.map((reading) => {
            const isExpanded = expandedId === reading.id;
            return (
              <div
                key={reading.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 md:p-6 transition-all shadow-lg"
              >
                {/* Summary row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-amber-400/90 font-mono mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(reading.timestamp).toLocaleDateString('pt-BR')}</span>
                      <span>·</span>
                      <span>{new Date(reading.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span className="text-slate-400">{reading.spreadName}</span>
                    </div>

                    <h3 className="font-cinzel font-bold text-base sm:text-lg text-slate-100">
                      "{reading.question}"
                    </h3>

                    {/* Micro cards preview */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reading.cards.map((c, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300"
                        >
                          <strong className="text-amber-300">{c.name}</strong> ({c.isUpright ? 'Direta' : 'Invertida'})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(reading);
                      }}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Copiar Leitura Completa"
                    >
                      {copiedId === reading.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja apagar esta leitura sagrada do diário?')) {
                          onDeleteReading(reading.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 transition-colors"
                      title="Remover do Diário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button className="p-2 text-slate-400 hover:text-slate-200">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-800 space-y-6 animate-fade-in">
                    {/* Cards Breakdown */}
                    <div>
                      <h4 className="text-xs font-mono uppercase text-amber-400 tracking-wider mb-3">
                        Posições Reveladas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {reading.cards.map((c, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-800"
                          >
                            <span className="text-[10px] text-amber-400/80 uppercase font-mono block">
                              {c.positionTitle}
                            </span>
                            <span className="font-cinzel font-bold text-sm text-slate-100">
                              {c.name}
                            </span>
                            <span
                              className={`block text-[10px] mt-0.5 ${
                                c.isUpright ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {c.isUpright ? 'Luz / Direta' : 'Sombra / Invertida'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Oracle Prophecy if present */}
                    {reading.oracleInterpretation && (
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 tracking-widest">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Interpretação do Oráculo</span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-line">
                          {reading.oracleInterpretation}
                        </div>
                      </div>
                    )}

                    {/* Personal Notes Section */}
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          Suas Notas Pessoais:
                        </span>
                        {editingNotesId !== reading.id && (
                          <button
                            onClick={() => {
                              setEditingNotesId(reading.id);
                              setTempNotes(reading.notes || '');
                            }}
                            className="text-xs text-amber-400 hover:underline"
                          >
                            Editar Notas
                          </button>
                        )}
                      </div>

                      {editingNotesId === reading.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            placeholder="Escreva suas impressões pessoais..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-300"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveNotes(reading.id)}
                              className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {reading.notes || 'Nenhuma nota registrada para esta leitura.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
