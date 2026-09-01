import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Brain, ShieldAlert, Target, Users, TrendingUp, AlertTriangle, ArrowRight, Activity, Zap, ClipboardList } from 'lucide-react';
import { FantasyTeam, OpponentForecast as ForecastType } from '../types';
import { motion } from 'motion/react';

interface OpponentForecastProps {
  userTeam: FantasyTeam;
  opponentTeam: FantasyTeam;
  categoryPrefs?: Record<string, boolean>;
  getFullUrl?: (path: string) => string;
}

export default function OpponentForecast({ userTeam, opponentTeam, categoryPrefs, getFullUrl = (p) => p }: OpponentForecastProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const filteredHighRiskCategories = useMemo(() => {
    if (!forecast) return [];
    return forecast.highRiskCategories.filter((c) => !categoryPrefs || categoryPrefs[c.category] !== false);
  }, [forecast, categoryPrefs]);

  const filteredCategoryComparisons = useMemo(() => {
    if (!forecast) return [];
    return forecast.categoryComparisons.filter((c) => !categoryPrefs || categoryPrefs[c.category] !== false);
  }, [forecast, categoryPrefs]);

  // loading steps for premium user experience
  const loadingSteps = [
    'Conectando con el motor analítico...',
    'Analizando promedios de la plantilla de Skyline Dunkers...',
    'Evaluando defensas perimetrales e interiores de Boston Ballers...',
    'Calculando correlación cruzada de categorías de Fantasy...',
    'Evaluando proyecciones de lesiones y minutos de juego...',
    'Compilando reporte estratégico final...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFetchForecast = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep(0);
    try {
      const response = await fetch(getFullUrl('/api/analyze/opponent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRoster: userTeam.roster,
          opponentRoster: opponentTeam.roster,
          userTeamName: userTeam.name,
          opponentTeamName: opponentTeam.name
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudo generar el pronóstico estratégico contra el oponente.');
      }
      const data = await response.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('####')) {
        return <h5 key={i} className="text-xs font-bold text-orange-400 mt-4 mb-1 uppercase tracking-wider">{line.replace('####', '').trim()}</h5>;
      } else if (line.startsWith('###')) {
        return <h4 key={i} className="text-sm font-bold text-neutral-100 mt-4 mb-2 first:mt-0">{line.replace('###', '').trim()}</h4>;
      } else if (line.startsWith('##')) {
        return <h3 key={i} className="text-base font-bold text-neutral-100 mt-5 mb-2 first:mt-0">{line.replace('##', '').trim()}</h3>;
      } else if (line.startsWith('* **') || line.startsWith('- **') || line.match(/^\d+\.\s+\*\*/)) {
        const matches = line.match(/^[\*\-]?\s*\d*\.?\s*\*\*(.*?)\*\*(.*)/);
        if (matches) {
          return (
            <p key={i} className="text-xs text-neutral-300 ml-4 mb-2 list-item list-disc leading-relaxed">
              <strong className="text-neutral-100">{matches[1]}</strong>{matches[2]}
            </p>
          );
        }
      }
      return line.trim() ? <p key={i} className="text-xs text-neutral-400 leading-relaxed mb-3.5">{line}</p> : null;
    });
  };

  // Pre-calculate easy metrics to display instantly before requesting full AI
  const userSize = userTeam.roster.length || 1;
  const oppSize = opponentTeam.roster.length || 1;

  const userPts = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.pts || 0), 0) / userSize).toFixed(1));
  const oppPts = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.pts || 0), 0) / oppSize).toFixed(1));

  const userAst = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.ast || 0), 0) / userSize).toFixed(1));
  const oppAst = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.ast || 0), 0) / oppSize).toFixed(1));

  const userReb = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.reb || 0), 0) / userSize).toFixed(1));
  const oppReb = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.reb || 0), 0) / oppSize).toFixed(1));

  const userStl = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.stl || 0), 0) / userSize).toFixed(1));
  const oppStl = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.stl || 0), 0) / oppSize).toFixed(1));

  const userBlk = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.blk || 0), 0) / userSize).toFixed(1));
  const oppBlk = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.blk || 0), 0) / oppSize).toFixed(1));

  const userTov = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.tov || 0), 0) / userSize).toFixed(1));
  const oppTov = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.tov || 0), 0) / oppSize).toFixed(1));

  const userTpm = Number((userTeam.roster.reduce((sum, p) => sum + (p.stats?.tpm || 0), 0) / userSize).toFixed(1));
  const oppTpm = Number((opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.tpm || 0), 0) / oppSize).toFixed(1));

  const userFgm = userTeam.roster.reduce((sum, p) => sum + (p.stats?.fgm || 0), 0);
  const userFga = userTeam.roster.reduce((sum, p) => sum + (p.stats?.fga || 1), 0);
  const userFgPct = Number(((userFgm / (userFga || 1)) * 100).toFixed(1));

  const oppFgm = opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.fgm || 0), 0);
  const oppFga = opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.fga || 1), 0);
  const oppFgPct = Number(((oppFgm / (oppFga || 1)) * 100).toFixed(1));

  const userFtm = userTeam.roster.reduce((sum, p) => sum + (p.stats?.ftm || 0), 0);
  const userFta = userTeam.roster.reduce((sum, p) => sum + (p.stats?.fta || 1), 0);
  const userFtPct = Number(((userFtm / (userFta || 1)) * 100).toFixed(1));

  const oppFtm = opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.ftm || 0), 0);
  const oppFta = opponentTeam.roster.reduce((sum, p) => sum + (p.stats?.fta || 1), 0);
  const oppFtPct = Number(((oppFtm / (oppFta || 1)) * 100).toFixed(1));

  return (
    <div id="opponent-forecast-section" className="space-y-6">
      {/* COMPARISON CARD SUMMARY HEADER */}
      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 relative z-10">
          {/* USER TEAM ACCENT */}
          <div className="flex-1 flex items-center gap-4">
            <img 
              src={userTeam.logo} 
              alt={userTeam.name} 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500/30 shadow-md shrink-0" 
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Tu Equipo</span>
                <span className="text-xs text-neutral-400 font-medium font-mono">Rank #{userTeam.ranking}</span>
              </div>
              <h4 className="text-lg font-black text-neutral-100 tracking-tight">{userTeam.name}</h4>
              <p className="text-xs text-neutral-400 font-semibold mt-0.5">Récord: <span className="text-emerald-400 font-mono">{userTeam.record.wins}-{userTeam.record.losses}</span></p>
            </div>
          </div>

          {/* VS SEPARATOR */}
          <div className="flex flex-col items-center justify-center py-2 md:py-0 px-4">
            <span className="w-px h-6 bg-neutral-800 hidden md:block mb-2"></span>
            <span className="text-xs font-black font-mono tracking-widest text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 shadow-inner">VS</span>
            <span className="w-px h-6 bg-neutral-800 hidden md:block mt-2"></span>
          </div>

          {/* OPPONENT TEAM ACCENT */}
          <div className="flex-1 flex items-center md:justify-end gap-4 text-left md:text-right">
            <div className="order-2 md:order-1">
              <div className="flex items-center md:justify-end gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">Rival de la Semana</span>
                <span className="text-xs text-neutral-400 font-medium font-mono">Rank #{opponentTeam.ranking}</span>
              </div>
              <h4 className="text-lg font-black text-neutral-100 tracking-tight">{opponentTeam.name}</h4>
              <p className="text-xs text-neutral-400 font-semibold mt-0.5">Récord: <span className="text-orange-400 font-mono">{opponentTeam.record.wins}-{opponentTeam.record.losses}</span></p>
            </div>
            <img 
              src={opponentTeam.logo} 
              alt={opponentTeam.name} 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-neutral-800 shadow-md shrink-0 order-1 md:order-2" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* BASIC SUMMARY COMPARISON BAR METRICS */}
        <div className="mt-6 pt-6 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          {(!categoryPrefs || categoryPrefs.pts) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">PTS (Puntos)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userPts >= oppPts ? 'text-emerald-400' : 'text-neutral-400'}`}>{userPts}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppPts > userPts ? 'text-orange-400' : 'text-neutral-400'}`}>{oppPts}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.reb) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">REB (Rebotes)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userReb >= oppReb ? 'text-emerald-400' : 'text-neutral-400'}`}>{userReb}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppReb > userReb ? 'text-orange-400' : 'text-neutral-400'}`}>{oppReb}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.ast) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">AST (Asistencias)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userAst >= oppAst ? 'text-emerald-400' : 'text-neutral-400'}`}>{userAst}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppAst > userAst ? 'text-orange-400' : 'text-neutral-400'}`}>{oppAst}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.stl) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">STL (Robos)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userStl >= oppStl ? 'text-emerald-400' : 'text-neutral-400'}`}>{userStl}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppStl > userStl ? 'text-orange-400' : 'text-neutral-400'}`}>{oppStl}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.blk) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">BLK (Bloqueos)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userBlk >= oppBlk ? 'text-emerald-400' : 'text-neutral-400'}`}>{userBlk}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppBlk > userBlk ? 'text-orange-400' : 'text-neutral-400'}`}>{oppBlk}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.tpm) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">3PM (Triples)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userTpm >= oppTpm ? 'text-emerald-400' : 'text-neutral-400'}`}>{userTpm}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppTpm > userTpm ? 'text-orange-400' : 'text-neutral-400'}`}>{oppTpm}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.tov) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">TOV (Pérdidas)</p>
              <div className="flex items-center justify-center gap-2">
                {/* Note: in TOV, LOWER is better for fantasy sports! */}
                <span className={`text-sm font-black font-mono ${userTov <= oppTov ? 'text-emerald-400' : 'text-neutral-400'}`}>{userTov}</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppTov < userTov ? 'text-orange-400' : 'text-neutral-400'}`}>{oppTov}</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.fgPct) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">FG% (TC%)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userFgPct >= oppFgPct ? 'text-emerald-400' : 'text-neutral-400'}`}>{userFgPct}%</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppFgPct > userFgPct ? 'text-orange-400' : 'text-neutral-400'}`}>{oppFgPct}%</span>
              </div>
            </div>
          )}
          {(!categoryPrefs || categoryPrefs.ftPct) && (
            <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">FT% (TL%)</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-sm font-black font-mono ${userFtPct >= oppFtPct ? 'text-emerald-400' : 'text-neutral-400'}`}>{userFtPct}%</span>
                <span className="text-[10px] text-neutral-600">vs</span>
                <span className={`text-sm font-black font-mono ${oppFtPct > userFtPct ? 'text-orange-400' : 'text-neutral-400'}`}>{oppFtPct}%</span>
              </div>
            </div>
          )}
          <div className="space-y-1 p-2 bg-neutral-950/20 border border-neutral-800/50 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tamaño Roster</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-black font-mono text-neutral-300">{userTeam.roster.length}</span>
              <span className="text-[10px] text-neutral-600">vs</span>
              <span className="text-sm font-black font-mono text-neutral-300">{opponentTeam.roster.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTON OR LOADING STATE */}
      {!forecast && !isLoading && (
        <div className="text-center py-8 bg-neutral-900/20 rounded-2xl border border-neutral-800 border-dashed p-6 flex flex-col items-center justify-center gap-3">
          <Brain className="w-8 h-8 text-orange-500 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-200">Análisis del Oponente No Generado</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Genera una comparación estratégica profunda asistida por IA para descubrir qué categorías están en riesgo de perderse y cómo defenderlas.
            </p>
          </div>
          <button
            id="btn-generate-opponent-forecast"
            onClick={handleFetchForecast}
            className="mt-2 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-lg shadow-orange-600/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            Generar Pronóstico Estratégico IA
          </button>
        </div>
      )}

      {isLoading && (
        <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 flex flex-col items-center justify-center gap-5 text-center min-h-[250px]">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-neutral-800 border-t-orange-500 animate-spin"></div>
            <Activity className="w-5 h-5 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-sm">
            <p className="text-sm font-bold text-neutral-200 tracking-tight">Procesando Inteligencia de Combate Semanal</p>
            <p className="text-xs text-orange-400 font-mono font-bold animate-pulse h-4">{loadingSteps[loadingStep]}</p>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Esto nos toma unos segundos mientras comparamos el rendimiento proyectado de cada jugador en tu roster contra {opponentTeam.name}.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Error de Análisis</h4>
            <p className="text-xs text-neutral-300 mt-1">{error}</p>
            <button 
              onClick={handleFetchForecast} 
              className="mt-2 text-xs font-bold text-orange-400 hover:text-orange-300 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {forecast && !isLoading && (
        <div className="space-y-6">
          {/* FORECAST HEADER META INFO */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-neutral-900/50 border border-neutral-800 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black text-neutral-200 uppercase tracking-wider">Pronóstico Completo</span>
            </div>
            {forecast.modelUsed === 'offline-analytics' ? (
              <span className="text-[10px] text-amber-500 font-bold font-mono px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                FALLBACK: MOTOR DE ANÁLISIS LOCAL
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-bold font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                SISTEMA IA: {(forecast.modelUsed || 'GEMINI-3.5-FLASH').toUpperCase()}
              </span>
            )}
          </div>

          {/* TWO COLUMN GRID: VULNERABILITY & CATEGORIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: HIGH RISK CATEGORIES */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Categorías en Riesgo Crítico / Medio</h4>
              </div>

              {filteredHighRiskCategories.length === 0 ? (
                <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-2">
                  <Target className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">¡Ninguna Categoría en Alto Riesgo!</h4>
                  <p className="text-xs text-neutral-400">
                    Tu equipo se proyecta superior en todos los promedios estadísticos esta semana. Mantén tu alineación optimizada para garantizar la victoria.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredHighRiskCategories.map((c, i) => (
                    <div 
                      key={i} 
                      className="bg-neutral-900/30 rounded-xl border border-neutral-800 p-4 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-neutral-100">{c.categoryLabel}</span>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-red-500/10 text-red-400 border border-red-500/10 uppercase tracking-wider">Riesgo Alto</span>
                          </div>
                          <p className="text-xs text-neutral-400 leading-relaxed">{c.reason}</p>
                        </div>
                        <div className="text-right shrink-0 bg-neutral-900/80 border border-neutral-800 px-2.5 py-1.5 rounded-lg">
                          <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Tú vs Rival</div>
                          <div className="text-xs font-bold font-mono text-neutral-300 mt-0.5">
                            <span className="text-neutral-400">{c.userAverage}</span> <span className="text-neutral-600">/</span> <span className="text-orange-400">{c.opponentAverage}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 2: ALL CATEGORY COMPARISONS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Comparativa General del Matchup</h4>
              </div>

              <div className="bg-neutral-900/20 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-800 pb-2">
                  <div className="col-span-4">Categoría</div>
                  <div className="col-span-2 text-center">Tú</div>
                  <div className="col-span-2 text-center">Rival</div>
                  <div className="col-span-4 text-right">Ventaja</div>
                </div>

                {filteredCategoryComparisons.map((c, i) => {
                  const isUserAdvantage = c.advantage === 'user';
                  const isOpponentAdvantage = c.advantage === 'opponent';
                  
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs border-b border-neutral-800/40 pb-3 last:border-0 last:pb-0">
                      <div className="col-span-4 font-bold text-neutral-200">{c.categoryLabel}</div>
                      <div className={`col-span-2 text-center font-bold font-mono ${isUserAdvantage ? 'text-emerald-400' : 'text-neutral-400'}`}>
                        {c.userAverage}
                      </div>
                      <div className={`col-span-2 text-center font-bold font-mono ${isOpponentAdvantage ? 'text-orange-400' : 'text-neutral-400'}`}>
                        {c.opponentAverage}
                      </div>
                      <div className="col-span-4 text-right">
                        {isUserAdvantage && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase">
                            Tú (+{Math.abs(c.userAverage - c.opponentAverage).toFixed(1)})
                          </span>
                        )}
                        {isOpponentAdvantage && (
                          <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold text-[10px] uppercase">
                            Rival (+{Math.abs(c.opponentAverage - c.userAverage).toFixed(1)})
                          </span>
                        )}
                        {c.advantage === 'even' && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px] uppercase">
                            Empate
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION: KEY RIVAL THREATS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Amenazas Rival Clave a Vigilar</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forecast.keyRivalPlayers.map((player, i) => (
                <div 
                  key={i} 
                  className="bg-neutral-900/30 rounded-xl border border-neutral-800 p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <h5 className="text-xs font-black text-neutral-100">{player.name}</h5>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider shrink-0">
                        Peligro
                      </span>
                    </div>
                    <p className="text-[10px] font-bold font-mono text-orange-400 bg-orange-500/5 border border-orange-500/10 px-2 py-1 rounded w-fit">
                      🔥 {player.statsHighlight}
                    </p>
                    <p className="text-xs text-neutral-400 leading-relaxed">{player.threatDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: RECENT FORM PREDICTIONS (LAST 3 WEEKS) */}
          {forecast.recentFormPredictions && forecast.recentFormPredictions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Probabilidad por Rendimiento Reciente (Últimas 3 Semanas)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forecast.recentFormPredictions.filter(c => !categoryPrefs || categoryPrefs[c.category] !== false).map((pred, i) => {
                  const isUserFavored = pred.predictedWinner === 'user';
                  const isOpponentFavored = pred.predictedWinner === 'opponent';
                  
                  return (
                    <div key={i} className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2">
                          <span className="text-xs font-bold text-neutral-200">{pred.categoryLabel}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isUserFavored ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            isOpponentFavored ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {pred.winProbability}% Prob.
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex flex-col items-center">
                            <span className="text-neutral-500 mb-1">Tú</span>
                            <span className={`font-bold ${isUserFavored ? 'text-emerald-400' : 'text-neutral-300'}`}>{pred.userRecentAverage}</span>
                          </div>
                          <span className="text-neutral-700 text-xs">vs</span>
                          <div className="flex flex-col items-center">
                            <span className="text-neutral-500 mb-1">Rival</span>
                            <span className={`font-bold ${isOpponentFavored ? 'text-orange-400' : 'text-neutral-300'}`}>{pred.opponentRecentAverage}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-neutral-400 leading-relaxed mt-2 pt-2 border-t border-neutral-800/60">
                          {pred.reasoning}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: AI Strategic Verdict */}
          <div className="bg-gradient-to-br from-neutral-900/60 to-neutral-950/20 border border-neutral-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-3 relative z-10">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Análisis y Plan de Batalla Táctico</h4>
            </div>

            <div className="relative z-10 text-xs leading-relaxed space-y-1">
              {renderFormattedText(forecast.aiVerdict)}
            </div>
          </div>

          {/* TRIGGER RE-GENERATE BUTTON */}
          <div className="text-center pt-2">
            <button
              onClick={handleFetchForecast}
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-100 text-xs font-bold font-mono uppercase tracking-wider px-4 py-2 border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Volver a Generar Pronóstico IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

