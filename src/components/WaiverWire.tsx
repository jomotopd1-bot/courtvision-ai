import { useState, useEffect, useMemo } from 'react';
import { Player, WaiverRecommendation } from '../types.js';
import { Sparkles, TrendingDown, UserPlus, AlertCircle, ArrowUpRight, Activity, Percent, Flame, RefreshCw, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WaiverWireProps {
  roster: Player[];
  categoryPrefs?: Record<string, boolean>;
  getFullUrl?: (path: string) => string;
}

export default function WaiverWire({ roster, categoryPrefs, getFullUrl = (p) => p }: WaiverWireProps) {
  const [recommendation, setRecommendation] = useState<WaiverRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeKeys = useMemo(() => {
    const defaultKeys = ['pts', 'reb', 'ast', 'stl', 'blk', 'tpm'];
    if (!categoryPrefs) return defaultKeys;
    return defaultKeys.filter(k => categoryPrefs[k]);
  }, [categoryPrefs]);

  const fetchRecommendations = async (currentRoster: Player[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getFullUrl('/api/analyze/waiver'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roster: currentRoster }),
      });

      if (!response.ok) {
        throw new Error('No se pudo generar el análisis del Waiver Wire');
      }

      const data = await response.json() as WaiverRecommendation;
      setRecommendation(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error inesperado al conectar con el asistente de Waiver Wire');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (roster && roster.length > 0) {
      fetchRecommendations(roster);
    }
  }, [roster]);

  // Simple, highly stylized helper to render the verdict's basic Markdown safely
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-neutral-100 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            {trimmed.slice(4)}
          </h4>
        );
      }
      if (trimmed.startsWith('1. ') || trimmed.startsWith('* ')) {
        const content = trimmed.replace(/^(1\.\s+|\*\s+)/, '');
        // Highlight bold elements
        return (
          <li key={idx} className="text-xs text-neutral-300 ml-4 list-disc space-y-1 mb-1 leading-relaxed">
            {renderBoldText(content)}
          </li>
        );
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <p key={idx} className="text-xs font-bold text-orange-400 mt-2 mb-1">
            {trimmed.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-neutral-400 leading-relaxed mb-2">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) => (
      i % 2 === 1 ? <strong key={i} className="text-neutral-200 font-bold">{part}</strong> : part
    ));
  };

  return (
    <div id="waiver-wire-analysis-panel" className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-br from-neutral-900/60 to-neutral-950/20 rounded-2xl border border-neutral-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl"></div>
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-600/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
              AI Waiver Agent
            </span>
            {recommendation?.modelUsed === 'offline-analytics' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] text-amber-500 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                  FALLBACK: MOTOR ESTADÍSTICO LOCAL
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                  SISTEMA IA: {(recommendation?.modelUsed || 'GEMINI-3.5-FLASH').toUpperCase()}
                </span>
              </>
            )}
          </div>
          <h2 className="text-lg font-black text-neutral-100 tracking-tight flex items-center gap-2">
            Recomendador Inteligente de Agentes Libres (Waiver Wire)
          </h2>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            Nuestra IA analiza automáticamente las debilidades estadísticas promedio de tu plantilla actual y las contrasta con los mejores agentes libres disponibles en el Waiver Wire para recomendarte fichajes quirúrgicos.
          </p>
        </div>

        <button
          onClick={() => fetchRecommendations(roster)}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          Reanalizar Plantilla
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4"
          >
            <div className="relative">
              <div className="w-12 h-12 border-4 border-orange-600/20 border-t-orange-500 rounded-full animate-spin"></div>
              <Activity className="w-5 h-5 text-orange-500 absolute top-3.5 left-3.5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-200">Ejecutando Diagnóstico de Categorías</h4>
              <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                Calculando promedios de plantilla, buscando debilidades de H2H y evaluando encaje de agentes libres...
              </p>
            </div>
          </motion.div>
        )}

        {error && !isLoading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-3"
          >
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <h4 className="text-sm font-bold text-red-400">Error en el análisis</h4>
            <p className="text-xs text-neutral-400">{error}</p>
            <button
              onClick={() => fetchRecommendations(roster)}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition"
            >
              Reintentar
            </button>
          </motion.div>
        )}

        {recommendation && !isLoading && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
          >
            {/* LEFT 2 COLUMNS: CATEGORIES & PLAYERS */}
            <div className="lg:col-span-2 space-y-6">
              {/* WEAKEST CATEGORIES */}
              <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                    Categorías Críticas a Reforzar
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendation.weakestCategories.map((cat, idx) => {
                    const ratio = Math.min((cat.average / cat.targetAverage) * 100, 100);
                    return (
                      <div key={idx} className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-orange-400 tracking-tight">{cat.category}</span>
                          <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">{cat.description}</p>
                        </div>
                        
                        <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
                          <div className="flex justify-between items-baseline text-[10px]">
                            <span className="text-neutral-500 font-medium">Promedio: <strong className="text-neutral-300 font-mono font-bold">{cat.average}</strong></span>
                            <span className="text-neutral-500 font-medium">Meta: <strong className="text-neutral-400 font-mono font-bold">{cat.targetAverage}</strong></span>
                          </div>
                          
                          {/* PROGRESS BAR */}
                          <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${ratio}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                ratio < 70 ? 'bg-red-500' : ratio < 90 ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RECOMMENDED PLAYERS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <UserPlus className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                    Agentes Libres Sugeridos (Ajuste Óptimo)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendation.recommendedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between gap-4 hover:border-orange-500/30 transition-all group"
                    >
                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-neutral-100 group-hover:text-orange-400 transition">
                              {player.name}
                            </span>
                            <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 rounded font-mono font-bold">
                              {player.nbaTeam}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {player.positions.map((pos) => (
                              <span key={pos} className="text-[8px] bg-neutral-950 border border-neutral-800 text-orange-400 font-bold px-1.5 py-0.5 rounded-md">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* FIT SCORE CIRCLE */}
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg border ${
                            player.fitScore >= 80 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : player.fitScore >= 60 
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}>
                            {player.fitScore}% Fit
                          </span>
                          <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Compatibilidad</span>
                        </div>
                      </div>

                      {/* STATS STRIP */}
                      <div 
                        className="grid gap-1 bg-neutral-950/50 rounded-lg p-2 text-center border border-neutral-800/40"
                        style={{ gridTemplateColumns: `repeat(${activeKeys.length || 1}, minmax(0, 1fr))` }}
                      >
                        {activeKeys.includes('pts') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">PTS</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.pts}</span>
                          </div>
                        )}
                        {activeKeys.includes('ast') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">AST</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.ast}</span>
                          </div>
                        )}
                        {activeKeys.includes('reb') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">REB</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.reb}</span>
                          </div>
                        )}
                        {activeKeys.includes('stl') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">STL</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.stl}</span>
                          </div>
                        )}
                        {activeKeys.includes('blk') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">BLK</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.blk}</span>
                          </div>
                        )}
                        {activeKeys.includes('tpm') && (
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-neutral-500 font-bold block">3PM</span>
                            <span className="text-[10px] font-bold text-neutral-300 font-mono">{player.stats.tpm}</span>
                          </div>
                        )}
                      </div>

                      {/* EXPLANATION */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                          {player.reason}
                        </p>
                        
                        <div className="flex items-center gap-1.5 bg-orange-500/5 rounded-lg p-2 border border-orange-500/10">
                          <ArrowUpRight className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-[10px] text-neutral-300 font-bold">
                            Impacto proyectado: <span className="text-orange-400">{player.impactDescription}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILED AI ADVICE */}
            <div className="space-y-6">
              <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-800/80">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                    Veredicto Táctico de la IA
                  </h3>
                </div>

                <div className="space-y-4">
                  {renderMarkdown(recommendation.aiVerdict)}
                </div>

                {/* HELPFUL BANNER */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">¿Por qué es clave el Waiver?</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                    Frecuentemente el 40% de las ligas H2H de NBA Fantasy se ganan identificando tendencias tempranas de agentes libres. Ajustar tu plantilla para equilibrar los enfrentamientos semanales optimiza tu potencial de playoffs.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
