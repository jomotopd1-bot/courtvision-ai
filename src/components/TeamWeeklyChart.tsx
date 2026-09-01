import { useState, useMemo, useEffect } from 'react';
import { Player } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart2, TrendingUp, Sparkles, Flame, ShieldAlert, Award, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeamWeeklyChartProps {
  roster: Player[];
  teamName: string;
  categoryPrefs?: Record<string, boolean>;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ALL_CATEGORIES = [
  { key: 'Puntos', label: 'Puntos (PTS)', color: '#f97316' },
  { key: 'Rebotes', label: 'Rebotes (REB)', color: '#10b981' },
  { key: 'Asistencias', label: 'Asistencias (AST)', color: '#0ea5e9' },
  { key: 'Robos', label: 'Robos (STL)', color: '#ec4899' },
  { key: 'Bloqueos', label: 'Bloqueos (BLK)', color: '#8b5cf6' },
  { key: 'Pérdidas', label: 'Pérdidas (TOV)', color: '#ef4444' },
  { key: 'Triples', label: 'Triples (3PM)', color: '#eab308' },
  { key: 'TC%', label: 'TC% (FG%)', color: '#14b8a6' },
  { key: 'TL%', label: 'TL% (FT%)', color: '#6366f1' }
];

const PREF_MAP: Record<string, string> = {
  pts: 'Puntos',
  reb: 'Rebotes',
  ast: 'Asistencias',
  stl: 'Robos',
  blk: 'Bloqueos',
  tov: 'Pérdidas',
  tpm: 'Triples',
  fgPct: 'TC%',
  ftPct: 'TL%'
};

// A simple deterministic pseudo-random generator based on player ID and day
function createSeededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export default function TeamWeeklyChart({ roster, teamName, categoryPrefs }: TeamWeeklyChartProps) {
  const [chartType, setChartType] = useState<'composed' | 'area' | 'bar'>('composed');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['Puntos', 'Rebotes', 'Asistencias']);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Compute active categories according to user preferences
  const activeCategories = useMemo(() => {
    if (!categoryPrefs) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter(cat => {
      const prefKey = Object.keys(PREF_MAP).find(k => PREF_MAP[k] === cat.key);
      return prefKey ? categoryPrefs[prefKey] : true;
    });
  }, [categoryPrefs]);

  useEffect(() => {
    if (categoryPrefs) {
      const activeKeys = ALL_CATEGORIES.filter(cat => {
        const prefKey = Object.keys(PREF_MAP).find(k => PREF_MAP[k] === cat.key);
        return prefKey ? categoryPrefs[prefKey] : true;
      }).map(c => c.key);
      setVisibleCategories(activeKeys);
    }
  }, [categoryPrefs]);

  const toggleCategory = (key: string) => {
    setVisibleCategories(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one visible
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Generate deterministic weekly schedule and stats based on actual player data
  const weeklyData = useMemo(() => {
    if (!roster || !Array.isArray(roster) || roster.length === 0) return [];

    return DAYS_OF_WEEK.map((day) => {
      let pts = 0;
      let reb = 0;
      let ast = 0;
      let stl = 0;
      let blk = 0;
      let tov = 0;
      let tpm = 0;
      let fgm = 0;
      let fga = 0;
      let ftm = 0;
      let fta = 0;
      let activeCount = 0;

      roster.forEach((player) => {
        if (!player || !player.stats) return;
        // Deterministic schedule check: does this player play today?
        const seedStr = `${player.id}-${day}`;
        const rand = createSeededRandom(seedStr);
        
        // NBA teams play 3-4 games a week, so approx 50% chance of playing on any given day
        const playsToday = rand() > 0.5 && player.injuryStatus === 'ACTIVE';

        if (playsToday) {
          activeCount++;
          // Add player's base average stats + realistic variation (variance of up to 30%)
          const varianceMultiplier = 0.85 + rand() * 0.3; // between 0.85 and 1.15
          pts += Math.round((player.stats.pts || 0) * varianceMultiplier);
          reb += Math.round((player.stats.reb || 0) * varianceMultiplier);
          ast += Math.round((player.stats.ast || 0) * varianceMultiplier);
          stl += Math.round((player.stats.stl || 0) * varianceMultiplier);
          blk += Math.round((player.stats.blk || 0) * varianceMultiplier);
          tov += Math.round((player.stats.tov || 0) * varianceMultiplier);
          tpm += Math.round((player.stats.tpm || 0) * varianceMultiplier);
          fgm += Math.round((player.stats.fgm || 0) * varianceMultiplier);
          fga += Math.round((player.stats.fga || 0) * varianceMultiplier);
          ftm += Math.round((player.stats.ftm || 0) * varianceMultiplier);
          fta += Math.round((player.stats.fta || 0) * varianceMultiplier);
        } else if (player.injuryStatus !== 'ACTIVE' && rand() > 0.9) {
          // Injured players have a tiny chance of getting accidental minor minutes if they play through injury
          activeCount++;
          const dm = 0.4;
          pts += Math.round((player.stats.pts || 0) * dm);
          reb += Math.round((player.stats.reb || 0) * 0.5);
          ast += Math.round((player.stats.ast || 0) * dm);
          stl += Math.round((player.stats.stl || 0) * dm);
          blk += Math.round((player.stats.blk || 0) * dm);
          tov += Math.round((player.stats.tov || 0) * dm);
          tpm += Math.round((player.stats.tpm || 0) * dm);
          fgm += Math.round((player.stats.fgm || 0) * dm);
          fga += Math.round((player.stats.fga || 0) * dm);
          ftm += Math.round((player.stats.ftm || 0) * dm);
          fta += Math.round((player.stats.fta || 0) * dm);
        }
      });

      return {
        day,
        Puntos: pts,
        Rebotes: reb,
        Asistencias: ast,
        Robos: stl,
        Bloqueos: blk,
        Pérdidas: tov,
        Triples: tpm,
        TCM: fgm,
        TCA: fga,
        TLM: ftm,
        TLA: fta,
        'TC%': fga > 0 ? Number((fgm / fga * 100).toFixed(1)) : 0,
        'TL%': fta > 0 ? Number((ftm / fta * 100).toFixed(1)) : 0,
        JugadoresActivos: activeCount
      };
    });
  }, [roster]);

  // Compute total weekly stats
  const totals = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, tpm: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, games: 0 };
    }
    return weeklyData.reduce(
      (acc, curr) => {
        acc.pts += (curr.Puntos || 0);
        acc.reb += (curr.Rebotes || 0);
        acc.ast += (curr.Asistencias || 0);
        acc.stl += (curr.Robos || 0);
        acc.blk += (curr.Bloqueos || 0);
        acc.tov += (curr.Pérdidas || 0);
        acc.tpm += (curr.Triples || 0);
        acc.fgm += (curr.TCM || 0);
        acc.fga += (curr.TCA || 0);
        acc.ftm += (curr.TLM || 0);
        acc.fta += (curr.TLA || 0);
        acc.games += (curr.JugadoresActivos || 0);
        return acc;
      },
      { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, tpm: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, games: 0 }
    );
  }, [weeklyData]);

  // Compute total percentages
  const totalPercentages = useMemo(() => {
    return {
      fgPct: totals.fga > 0 ? Number((totals.fgm / totals.fga * 100).toFixed(1)) : 0,
      ftPct: totals.fta > 0 ? Number((totals.ftm / totals.fta * 100).toFixed(1)) : 0
    };
  }, [totals]);

  // Highlight high-performance stats
  const maxStats = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, tpm: 0, fgPct: 0, ftPct: 0 };
    }
    const safeMax = (arr: number[]) => {
      const filtered = arr.filter(n => !isNaN(n));
      return filtered.length > 0 ? Math.max(...filtered) : 0;
    };
    return {
      pts: safeMax(weeklyData.map(d => d.Puntos)),
      reb: safeMax(weeklyData.map(d => d.Rebotes)),
      ast: safeMax(weeklyData.map(d => d.Asistencias)),
      stl: safeMax(weeklyData.map(d => d.Robos)),
      blk: safeMax(weeklyData.map(d => d.Bloqueos)),
      tov: safeMax(weeklyData.map(d => d.Pérdidas)),
      tpm: safeMax(weeklyData.map(d => d.Triples)),
      fgPct: safeMax(weeklyData.map(d => d['TC%'])),
      ftPct: safeMax(weeklyData.map(d => d['TL%']))
    };
  }, [weeklyData]);

  return (
    <div id="weekly-performance-chart" className={isFullScreen ? "fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-y-auto" : "bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm space-y-6"}>
      {isFullScreen && (
        <div className="absolute inset-0 pointer-events-none -z-10" />
      )}
      <div className={isFullScreen ? "w-full max-w-7xl bg-[#0a0a0a] rounded-2xl border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl relative" : "space-y-6"}>
        {/* HEADER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500" />
            Rendimiento Semanal de {teamName}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Volumen acumulado e indicadores detallados (Lunes a Domingo) para la plantilla activa.
          </p>
        </div>

        {/* CHART CONTROLS */}
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-center items-center gap-1">
          <div className="flex gap-0.5">
            <button
              onClick={() => setChartType('composed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                chartType === 'composed'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Combinado
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                chartType === 'area'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Área
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                chartType === 'bar'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Barras
            </button>
          </div>
          <div className="w-px h-6 bg-neutral-800 mx-1"></div>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* METRICS GRID SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* CARD 1: Puntos */}
        {(!categoryPrefs || categoryPrefs.pts) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Puntos (PTS)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-orange-400 font-mono">{totals.pts}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{Math.round(totals.pts / 7)} p/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500 shrink-0" /> Max día: {maxStats.pts} PTS
            </p>
          </div>
        )}

        {/* CARD 2: Rebotes */}
        {(!categoryPrefs || categoryPrefs.reb) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Rebotes (REB)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-emerald-400 font-mono">{totals.reb}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{Math.round(totals.reb / 7)} r/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" /> Max día: {maxStats.reb} REB
            </p>
          </div>
        )}

        {/* CARD 3: Asistencias */}
        {(!categoryPrefs || categoryPrefs.ast) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Asistencias (AST)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-sky-400 font-mono">{totals.ast}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{Math.round(totals.ast / 7)} a/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-500 shrink-0" /> Max día: {maxStats.ast} AST
            </p>
          </div>
        )}

        {/* CARD 4: Robos */}
        {(!categoryPrefs || categoryPrefs.stl) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Robos (STL)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-pink-400 font-mono">{totals.stl}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{(totals.stl / 7).toFixed(1)} r/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-pink-500 shrink-0" /> Max día: {maxStats.stl} STL
            </p>
          </div>
        )}

        {/* CARD 5: Bloqueos */}
        {(!categoryPrefs || categoryPrefs.blk) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Bloqueos (BLK)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-purple-400 font-mono">{totals.blk}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{(totals.blk / 7).toFixed(1)} b/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500 shrink-0" /> Max día: {maxStats.blk} BLK
            </p>
          </div>
        )}

        {/* CARD 6: Triples */}
        {(!categoryPrefs || categoryPrefs.tpm) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Triples (3PM)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-yellow-400 font-mono">{totals.tpm}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{(totals.tpm / 7).toFixed(1)} t/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-yellow-500 shrink-0" /> Max día: {maxStats.tpm} 3PM
            </p>
          </div>
        )}

        {/* CARD 7: Pérdidas */}
        {(!categoryPrefs || categoryPrefs.tov) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Pérdidas (TOV)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-red-400 font-mono">{totals.tov}</span>
              <span className="text-[10px] text-neutral-400 font-medium">~{(totals.tov / 7).toFixed(1)} p/d</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" /> Max día: {maxStats.tov} TOV
            </p>
          </div>
        )}

        {/* CARD 8: FG% */}
        {(!categoryPrefs || categoryPrefs.fgPct) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tiros de Campo (FG%)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-teal-400 font-mono">{totalPercentages.fgPct}%</span>
              <span className="text-[10px] text-neutral-400 font-medium">{totals.fgm}/{totals.fga}</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-teal-500 shrink-0" /> Max día: {maxStats.fgPct}%
            </p>
          </div>
        )}

        {/* CARD 9: FT% */}
        {(!categoryPrefs || categoryPrefs.ftPct) && (
          <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tiros Libres (FT%)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-indigo-400 font-mono">{totalPercentages.ftPct}%</span>
              <span className="text-[10px] text-neutral-400 font-medium">{totals.ftm}/{totals.fta}</span>
            </div>
            <p className="text-[9px] text-neutral-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" /> Max día: {maxStats.ftPct}%
            </p>
          </div>
        )}

        {/* CARD 10: Actividad de Plantilla */}
        <div className="bg-neutral-950/40 border border-neutral-800/80 p-4 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Partidos Programados</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-neutral-200 font-mono">{totals.games}</span>
            <span className="text-[10px] text-neutral-400 font-medium">juegos</span>
          </div>
          <p className="text-[9px] text-neutral-500 flex items-center gap-1">
            <Award className="w-3 h-3 text-orange-400 shrink-0" /> Eficiencia óptima de alineación
          </p>
        </div>
      </div>

      {/* CATEGORY VISIBILITY CONTROLS */}
      <div className="space-y-2 bg-neutral-950/20 border border-neutral-850 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Filtro de Categorías del Gráfico</span>
          <div className="flex gap-2">
            <button
              onClick={() => setVisibleCategories(activeCategories.map(c => c.key))}
              className="text-[10px] font-bold text-orange-400 hover:text-orange-350 transition uppercase tracking-wider"
            >
              Seleccionar Todas
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => setVisibleCategories(activeCategories.length > 0 ? [activeCategories[0].key] : [])}
              className="text-[10px] font-bold text-neutral-400 hover:text-neutral-300 transition uppercase tracking-wider"
            >
              Solo {activeCategories.length > 0 ? activeCategories[0].key : 'Ninguna'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((cat) => {
            const isVisible = visibleCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                style={{
                  borderColor: isVisible ? cat.color : '#262626',
                  color: isVisible ? '#ffffff' : '#a3a3a3',
                  backgroundColor: isVisible ? `${cat.color}15` : 'transparent'
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 hover:opacity-95`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RECHARTS PLOT */}
      <div className={`w-full bg-neutral-950/20 rounded-xl border border-neutral-800/50 p-4 ${isFullScreen ? 'h-[500px]' : 'h-[280px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'composed' ? (
            <ComposedChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseMove={(state) => {
                if (state?.activeLabel) setHoveredDay(state.activeLabel);
              }}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <defs>
                <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#606060"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#606060"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#262626',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#e5e5e5', paddingBottom: '4px' }}
                itemStyle={{ fontSize: '11px', padding: '1px 0' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              
              {visibleCategories.includes('Puntos') && (
                <Area type="monotone" dataKey="Puntos" fill="url(#ptsGrad)" stroke="#f97316" strokeWidth={2} activeDot={{ r: 6 }} />
              )}
              {visibleCategories.includes('Rebotes') && (
                <Bar dataKey="Rebotes" fill="#10b981" barSize={16} radius={[4, 4, 0, 0]} opacity={0.8} />
              )}
              {visibleCategories.includes('Asistencias') && (
                <Line type="monotone" dataKey="Asistencias" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('Robos') && (
                <Line type="monotone" dataKey="Robos" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('Bloqueos') && (
                <Line type="monotone" dataKey="Bloqueos" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('Pérdidas') && (
                <Line type="monotone" dataKey="Pérdidas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('Triples') && (
                <Line type="monotone" dataKey="Triples" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('TC%') && (
                <Line type="monotone" dataKey="TC%" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              )}
              {visibleCategories.includes('TL%') && (
                <Line type="monotone" dataKey="TL%" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              )}
            </ComposedChart>
          ) : chartType === 'area' ? (
            <ComposedChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseMove={(state) => {
                if (state?.activeLabel) setHoveredDay(state.activeLabel);
              }}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="day" stroke="#606060" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#606060" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#262626',
                  borderRadius: '12px'
                }}
                labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#e5e5e5' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              
              {visibleCategories.includes('Puntos') && (
                <Area type="monotone" dataKey="Puntos" fill="#f97316" fillOpacity={0.15} stroke="#f97316" strokeWidth={2.5} />
              )}
              {visibleCategories.includes('Rebotes') && (
                <Area type="monotone" dataKey="Rebotes" fill="#10b981" fillOpacity={0.15} stroke="#10b981" strokeWidth={2} />
              )}
              {visibleCategories.includes('Asistencias') && (
                <Area type="monotone" dataKey="Asistencias" fill="#0ea5e9" fillOpacity={0.15} stroke="#0ea5e9" strokeWidth={2} />
              )}
              {visibleCategories.includes('Robos') && (
                <Area type="monotone" dataKey="Robos" fill="#ec4899" fillOpacity={0.15} stroke="#ec4899" strokeWidth={2} />
              )}
              {visibleCategories.includes('Bloqueos') && (
                <Area type="monotone" dataKey="Bloqueos" fill="#8b5cf6" fillOpacity={0.15} stroke="#8b5cf6" strokeWidth={2} />
              )}
              {visibleCategories.includes('Pérdidas') && (
                <Area type="monotone" dataKey="Pérdidas" fill="#ef4444" fillOpacity={0.15} stroke="#ef4444" strokeWidth={2} />
              )}
              {visibleCategories.includes('Triples') && (
                <Area type="monotone" dataKey="Triples" fill="#eab308" fillOpacity={0.15} stroke="#eab308" strokeWidth={2} />
              )}
              {visibleCategories.includes('TC%') && (
                <Area type="monotone" dataKey="TC%" fill="#14b8a6" fillOpacity={0.15} stroke="#14b8a6" strokeWidth={2} />
              )}
              {visibleCategories.includes('TL%') && (
                <Area type="monotone" dataKey="TL%" fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={2} />
              )}
            </ComposedChart>
          ) : (
            <ComposedChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseMove={(state) => {
                if (state?.activeLabel) setHoveredDay(state.activeLabel);
              }}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="day" stroke="#606060" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#606060" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#262626',
                  borderRadius: '12px'
                }}
                labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#e5e5e5' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              
              {visibleCategories.includes('Puntos') && (
                <Bar dataKey="Puntos" fill="#f97316" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Rebotes') && (
                <Bar dataKey="Rebotes" fill="#10b981" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Asistencias') && (
                <Bar dataKey="Asistencias" fill="#0ea5e9" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Robos') && (
                <Bar dataKey="Robos" fill="#ec4899" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Bloqueos') && (
                <Bar dataKey="Bloqueos" fill="#8b5cf6" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Pérdidas') && (
                <Bar dataKey="Pérdidas" fill="#ef4444" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('Triples') && (
                <Bar dataKey="Triples" fill="#eab308" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('TC%') && (
                <Bar dataKey="TC%" fill="#14b8a6" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
              {visibleCategories.includes('TL%') && (
                <Bar dataKey="TL%" fill="#6366f1" barSize={10} radius={[3, 3, 0, 0]} opacity={0.85} />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ADDITIONAL HELPFUL TIP */}
      <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex gap-3 items-center text-xs">
        <div className="shrink-0 w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
        <p className="text-neutral-400">
          {hoveredDay ? (
            <>Análisis para el <strong className="text-neutral-200">{hoveredDay}</strong>: Tu equipo disputará {weeklyData.find(d => d.day === hoveredDay)?.JugadoresActivos} partidos activos en la NBA.</>
          ) : (
            'Pasa el cursor sobre los días del gráfico para analizar la densidad de partidos programados y maximizar tus alineaciones diarias.'
          )}
        </p>
      </div>
      </div>
    </div>
  );
}

