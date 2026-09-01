import { useState, useMemo } from 'react';
import { User, Activity, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { Player } from '../types';

const FAVORABLE_MATCHUPS: Record<string, { opponent: string; difficulty: string; reason: string }> = {
  'DAL': { opponent: 'CHA', difficulty: 'Muy Favorable', reason: 'Defensa débil en transición' },
  'BOS': { opponent: 'DET', difficulty: 'Favorable', reason: 'Ventaja en rotación defensiva' },
  'GSW': { opponent: 'POR', difficulty: 'Muy Favorable', reason: 'Ritmo rápido de juego ofensivo' },
  'OKC': { opponent: 'WAS', difficulty: 'Muy Favorable', reason: 'Peor eficiencia defensiva' },
  'DEN': { opponent: 'UTA', difficulty: 'Favorable', reason: 'Debilidad interior frente a pívots' },
  'LAL': { opponent: 'BKN', difficulty: 'Favorable', reason: 'Superioridad física en la pintura' },
  'MIL': { opponent: 'TOR', difficulty: 'Favorable', reason: 'Defensa vulnerable ante penetraciones' },
  'MIA': { opponent: 'CHA', difficulty: 'Favorable', reason: 'Presión defensiva y pérdidas' },
  'PHX': { opponent: 'SAS', difficulty: 'Favorable', reason: 'Debilidad en defensa perimetral' },
  'MIN': { opponent: 'POR', difficulty: 'Muy Favorable', reason: 'Diferencial reboteador ofensivo' },
  'IND': { opponent: 'WAS', difficulty: 'Muy Favorable', reason: 'Ritmo alto de posesiones' },
  'SAC': { opponent: 'UTA', difficulty: 'Favorable', reason: 'Baja rotación en defensa de pintura' },
  'CLE': { opponent: 'DET', difficulty: 'Favorable', reason: 'Ventaja defensiva en la pintura' },
  'NYK': { opponent: 'BKN', difficulty: 'Favorable', reason: 'Diferencial físico e intensidad' }
};

interface RosterListProps {
  roster: Player[];
  teamName: string;
  categoryPrefs?: Record<string, boolean>;
}

export default function RosterList({ roster, teamName, categoryPrefs }: RosterListProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'injured' | 'high_performing' | 'matchup'>('all');

  const activeKeys = useMemo(() => {
    const defaultKeys = ['pts', 'reb', 'ast', 'stl', 'blk', 'tpm', 'tov', 'fgPct', 'ftPct'];
    if (!categoryPrefs) return ['pts', 'reb', 'ast', 'stl', 'blk', 'tpm']; // original standard columns
    return defaultKeys.filter(k => categoryPrefs[k]);
  }, [categoryPrefs]);

  const isHighPerforming = (player: Player) => {
    return player.stats.pts >= 22 || player.stats.ast >= 8 || player.stats.reb >= 10;
  };

  const filteredRoster = (roster || []).filter((player) => {
    if (!player) return false;
    if (activeFilter === 'injured') {
      return player.injuryStatus !== 'ACTIVE';
    }
    if (activeFilter === 'high_performing') {
      return isHighPerforming(player);
    }
    if (activeFilter === 'matchup') {
      return FAVORABLE_MATCHUPS[player.nbaTeam] !== undefined;
    }
    return true;
  });

  const getStatusBadge = (status: Player['injuryStatus'], details?: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Activo
          </span>
        );
      case 'OUT':
        return (
          <span
            title={details}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20 cursor-help"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            Fuera (OUT)
          </span>
        );
      case 'QUESTIONABLE':
        return (
          <span
            title={details}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20 cursor-help"
          >
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            Cuestionable
          </span>
        );
      case 'DAY_TO_DAY':
        return (
          <span
            title={details}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/20 cursor-help"
          >
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            Día a Día
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="roster-list-card" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-lg font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-neutral-400" />
            Plantilla de {teamName}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Analiza el rendimiento real y las proyecciones estadísticas semanales.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
          <Activity className="w-4 h-4 text-orange-500" />
          <span>Roster: {roster.length} jugadores</span>
        </div>
      </div>

      {/* Floating Filter Menu */}
      <div className="sticky top-2 z-10 flex justify-center mb-6">
        <div className="bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-full p-1.5 shadow-2xl flex items-center gap-1 sm:gap-2 max-w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            <span>Todos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeFilter === 'all' ? 'bg-orange-700 text-orange-100' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {roster.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveFilter('injured')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'injured'
                ? 'bg-red-500/25 text-red-400 border border-red-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Lesionados</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeFilter === 'injured' ? 'bg-red-500/30 text-red-200' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {roster.filter(p => p.injuryStatus !== 'ACTIVE').length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('high_performing')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'high_performing'
                ? 'bg-amber-500/25 text-amber-400 border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Estrellas IA</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeFilter === 'high_performing' ? 'bg-amber-500/30 text-amber-200' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {roster.filter(isHighPerforming).length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('matchup')}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'matchup'
                ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Matchup Favorable</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeFilter === 'matchup' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {roster.filter(p => FAVORABLE_MATCHUPS[p.nbaTeam] !== undefined).length}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {roster.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">No hay jugadores disponibles en esta plantilla.</p>
        ) : filteredRoster.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
            <User className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400 font-medium">No hay jugadores que coincidan con este filtro.</p>
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-3 px-3 py-1.5 bg-neutral-800 text-xs text-neutral-300 rounded-lg hover:bg-neutral-700 transition"
            >
              Ver todos los jugadores
            </button>
          </div>
        ) : (
          filteredRoster.map((player) => (
            <div
              key={player.id}
              className={`group p-5 rounded-2xl border transition-all duration-300 ${
                player.injuryStatus === 'OUT'
                  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                  : player.injuryStatus === 'QUESTIONABLE' || player.injuryStatus === 'DAY_TO_DAY'
                  ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                  : 'glass-card border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Info del Jugador */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl flex items-center justify-center font-black text-lg text-white border border-white/10 shadow-xl overflow-hidden group-hover:scale-105 transition-transform">
                      <span className="relative z-10 opacity-40">{player.name.split(' ').map(n => n[0]).join('')}</span>
                      <div className="absolute inset-0 bg-orange-600/10 group-hover:bg-orange-600/20 transition-colors"></div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-orange-600 text-[8px] font-black rounded border border-black uppercase tracking-tighter">
                      {player.nbaTeam}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-black text-white tracking-tight truncate uppercase italic">{player.name}</h4>
                      {player.stats && isHighPerforming(player) && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {player.positions.map((pos) => (
                          <span key={pos} className="px-1.5 py-0.5 bg-white/5 text-neutral-400 text-[9px] font-black rounded border border-white/10 uppercase tracking-widest">
                            {pos}
                          </span>
                        ))}
                      </div>
                      <div className="h-3 w-[1px] bg-white/10"></div>
                      {getStatusBadge(player.injuryStatus, player.injuryDetails)}
                    </div>
                  </div>
                </div>

                {/* Estadísticas - Grilla de Alto Impacto */}
                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-4 flex-1 max-w-3xl">
                  {player.stats && activeKeys.includes('pts') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Points</span>
                      <span className={`text-sm font-mono font-bold ${(player.stats.pts || 0) >= 22 ? 'text-orange-500' : 'text-white'}`}>
                        {(player.stats.pts || 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('reb') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Reb</span>
                      <span className="text-sm font-mono font-bold text-white">{(player.stats.reb || 0).toFixed(1)}</span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('ast') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Ast</span>
                      <span className="text-sm font-mono font-bold text-white">{(player.stats.ast || 0).toFixed(1)}</span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('stl') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Stl</span>
                      <span className="text-sm font-mono font-bold text-white">{(player.stats.stl || 0).toFixed(1)}</span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('blk') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Blk</span>
                      <span className="text-sm font-mono font-bold text-white">{(player.stats.blk || 0).toFixed(1)}</span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('tpm') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">3PM</span>
                      <span className="text-sm font-mono font-bold text-white">{(player.stats.tpm || 0).toFixed(1)}</span>
                    </div>
                  )}
                  {player.stats && activeKeys.includes('tov') && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">TOV</span>
                      <span className={`text-sm font-mono font-bold ${(player.stats.tov || 0) >= 3.5 ? 'text-red-400' : 'text-white'}`}>
                        {(player.stats.tov || 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Matchup Banner */}
              {FAVORABLE_MATCHUPS[player.nbaTeam] && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-500/20" />
                    <span className="text-[10px] font-bold text-neutral-400">
                      NEXT: <span className="text-white">{player.nbaTeam} @ {FAVORABLE_MATCHUPS[player.nbaTeam].opponent}</span>
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-500/20">
                    {FAVORABLE_MATCHUPS[player.nbaTeam].difficulty}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[11px] text-orange-300 flex items-start gap-1.5">
        <Sparkles className="w-4 h-4 shrink-0 text-orange-400 mt-0.5" />
        <span>
          Las estadísticas en color gris representan el <strong>rendimiento histórico promedio de la temporada</strong>. El valor en verde con icono de tendencia indica la <strong>proyección de rendimiento de aprendizaje automático</strong> para la próxima semana.
        </span>
      </div>
    </div>
  );
}


