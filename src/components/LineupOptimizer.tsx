import { useState } from 'react';
import { Sparkles, Brain, Check, ShieldAlert, Target, ClipboardList, HelpCircle } from 'lucide-react';
import { Player } from '../types';
import { motion } from 'motion/react';

interface LineupOptimizerProps {
  roster: Player[];
  teamName: string;
  getFullUrl?: (path: string) => string;
}

interface OptimizationResult {
  analysisText: string;
  weeklyLineup: {
    starters: string[];
    bench: string[];
  };
  categoryStrengths: string[];
  categoryWeaknesses: string[];
  waiverTargets: string[];
  modelUsed?: string;
}

export default function LineupOptimizer({ roster, teamName, getFullUrl = (p) => p }: LineupOptimizerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getFullUrl('/api/analyze/optimize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster })
      });
      if (!response.ok) {
        throw new Error('No se pudo completar el análisis de optimización.');
      }
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error de red.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format the markdown output to simple HTML segments safely
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('###')) {
        return <h4 key={i} className="text-sm font-bold text-neutral-100 mt-4 mb-2 first:mt-0">{line.replace('###', '').trim()}</h4>;
      } else if (line.startsWith('##')) {
        return <h3 key={i} className="text-base font-bold text-neutral-100 mt-5 mb-2 first:mt-0">{line.replace('##', '').trim()}</h3>;
      } else if (line.startsWith('* **') || line.startsWith('- **')) {
        const matches = line.match(/^[\*\-]\s+\*\*(.*?)\*\*(.*)/);
        if (matches) {
          return (
            <p key={i} className="text-xs text-neutral-300 ml-4 mb-1.5 list-item list-disc">
              <strong className="text-neutral-100">{matches[1]}</strong>{matches[2]}
            </p>
          );
        }
      }
      return line.trim() ? <p key={i} className="text-xs text-neutral-400 leading-relaxed mb-2">{line}</p> : null;
    });
  };

  return (
    <div id="lineup-optimizer-card" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-600/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
              AI Lineup Agent
            </span>
            {result && (
              result.modelUsed === 'offline-analytics' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[9px] text-amber-500 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                    FALLBACK: MOTOR DE ALINEACIÓN LOCAL
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    SISTEMA IA: {(result.modelUsed || 'GEMINI-3.5-FLASH').toUpperCase()}
                  </span>
                </>
              )
            )}
          </div>
          <h3 className="text-lg font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-orange-500" />
            Optimizador de Alineación IA
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Analiza el roster de <strong className="text-neutral-300">{teamName}</strong> y genera las mejores posiciones iniciales.
          </p>
        </div>

        <button
          id="btn-trigger-optimize"
          onClick={handleOptimize}
          disabled={isLoading || roster.length === 0}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:scale-98 text-white font-semibold rounded-xl text-xs transition duration-200 shadow-md shadow-orange-600/10 ${
            isLoading || roster.length === 0 ? 'bg-neutral-800 text-neutral-500 shadow-none cursor-not-allowed border border-neutral-800' : ''
          }`}
        >
          <Sparkles className="w-4 h-4 fill-white" />
          {isLoading ? 'Analizando con IA...' : 'Optimizar Alineación Semanal'}
        </button>
      </div>

      {isLoading && (
        <div id="optimizer-loading" className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-12 w-12 rounded-full bg-orange-500/20 opacity-20 animate-ping"></span>
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-neutral-100 mt-5">Corriendo algoritmos de aprendizaje automático...</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">Evaluando proyecciones de jugadores, agendas semanales y reportes de lesiones.</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl text-xs text-red-400 text-center">
          {error}
        </div>
      )}

      {!isLoading && !result && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
          <ClipboardList className="w-10 h-10 text-neutral-700 mb-2" />
          <h4 className="text-sm font-semibold text-neutral-200">Optimización Pendiente</h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Haz clic en el botón superior para realizar un análisis estadístico avanzado del roster de {teamName} con el modelo Gemini.
          </p>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Executive Summary */}
          <div className="p-5 bg-gradient-to-br from-orange-600/10 to-neutral-900/50 border border-orange-500/20 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 mb-3">
              <ClipboardList className="w-4 h-4" />
              Reporte Ejecutivo de IA
            </h4>
            <div className="prose max-w-none">
              {renderFormattedText(result.analysisText)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggested Lineup */}
            <div className="p-5 bg-neutral-900/30 border border-neutral-800 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-4">
                <Check className="w-4 h-4 text-emerald-400" />
                Alineación Recomendada (Iniciar / Sentar)
              </h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded w-fit uppercase tracking-wider mb-2">
                    Iniciar (Starters)
                  </h5>
                  <div className="space-y-1.5 pl-2">
                    {result.weeklyLineup.starters.map((player, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-neutral-200 font-medium">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        {player}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-neutral-400 bg-neutral-800 px-2 py-1 rounded w-fit uppercase tracking-wider mb-2 border border-neutral-700/50">
                    Banquillo (Bench)
                  </h5>
                  <div className="space-y-1.5 pl-2">
                    {result.weeklyLineup.bench.map((player, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="w-1.5 h-1.5 bg-neutral-700 rounded-full"></span>
                        {player}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="space-y-4">
              <div className="p-5 bg-emerald-950/10 border border-emerald-900/20 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-3">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Fortalezas Estadísticas
                </h4>
                <div className="space-y-1.5">
                  {result.categoryStrengths.map((strength, idx) => (
                    <div key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-amber-950/10 border border-amber-900/20 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Debilidades Estadísticas
                </h4>
                <div className="space-y-1.5">
                  {result.categoryWeaknesses.map((weakness, idx) => (
                    <div key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      <span>{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Waiver Wire Recommendations */}
          <div className="p-5 bg-neutral-950 border border-neutral-800 text-white rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 mb-3">
              <Target className="w-4 h-4" />
              Recomendación para la Agencia Libre (Waivers)
            </h4>
            <div className="space-y-2">
              {result.waiverTargets.map((target, idx) => (
                <div key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>{target}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

