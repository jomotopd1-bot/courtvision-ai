import { useState, useMemo } from 'react';
import { FantasyTeam, Player, NewsAlert } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  UserX,
  Stethoscope,
  Info,
  ChevronRight,
  Flame,
  Heart
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface InjuryTrackerProps {
  teams: FantasyTeam[];
  alerts: NewsAlert[];
}

export default function InjuryTracker({ teams, alerts }: InjuryTrackerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Compute injury metrics for each team
  const teamInjuryMetrics = useMemo(() => {
    return teams.map(team => {
      const roster = team.roster || [];
      const outPlayers = roster.filter(p => p.injuryStatus === 'OUT');
      const gtdPlayers = roster.filter(p => p.injuryStatus === 'QUESTIONABLE' || p.injuryStatus === 'DAY_TO_DAY');
      const totalInjuredCount = outPlayers.length + gtdPlayers.length;

      // Calculate a weighted risk index: OUT = 3.0, GTD/QUESTIONABLE = 1.2
      const weightedScore = (outPlayers.length * 3.0) + (gtdPlayers.length * 1.2);
      const riskIndex = Number((weightedScore / (roster.length || 1) * 10).toFixed(1));

      let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (riskIndex >= 1.5) riskCategory = 'MEDIUM';
      if (riskIndex >= 3.0) riskCategory = 'HIGH';

      return {
        id: team.id,
        name: team.name,
        logo: team.logo,
        owner: team.owner,
        outCount: outPlayers.length,
        gtdCount: gtdPlayers.length,
        totalInjured: totalInjuredCount,
        riskIndex,
        riskCategory,
        injuredPlayers: [...outPlayers, ...gtdPlayers]
      };
    }).sort((a, b) => b.riskIndex - a.riskIndex); // Sort by risk index descending
  }, [teams]);

  // Set default selected team if not set
  useMemo(() => {
    if (!selectedTeamId && teamInjuryMetrics.length > 0) {
      setSelectedTeamId(teamInjuryMetrics[0].id);
    }
  }, [teamInjuryMetrics, selectedTeamId]);

  const selectedTeamDetails = useMemo(() => {
    return teamInjuryMetrics.find(t => t.id === selectedTeamId) || null;
  }, [teamInjuryMetrics, selectedTeamId]);

  // Extract injury alerts from news to calculate recent trend frequency (e.g. injuries reported in recent hours)
  const injuryAlertsOverTime = useMemo(() => {
    const injuryAlerts = alerts.filter(a => a.type === 'injury');
    
    // Group recent alerts by standard periods or count them
    const recent24h = injuryAlerts.length; 
    const criticalCount = injuryAlerts.filter(a => a.severity === 'critical').length;
    
    return {
      totalAlerts: recent24h,
      criticalAlerts: criticalCount,
      avgSeverity: recent24h > 0 ? (criticalCount / recent24h * 100).toFixed(0) + '%' : '0%'
    };
  }, [alerts]);

  // Format data for Recharts BarChart
  const chartData = useMemo(() => {
    return [...teamInjuryMetrics]
      .reverse() // reverse so higher risk is at the top of horizontal layout
      .map(t => ({
        name: t.name,
        'Lesiones': t.totalInjured,
        'Riesgo': t.riskIndex,
        id: t.id,
        raw: t
      }));
  }, [teamInjuryMetrics]);

  return (
    <div id="injury-league-tracker" className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-neutral-950/40 rounded-xl border border-neutral-850 p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-red-600/10 text-red-500 rounded-lg shrink-0 border border-red-500/15">
            <Stethoscope className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Monitor de Epidemia de Lesiones</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
              Analiza en tiempo real qué gerentes de la liga están asumiendo mayor riesgo acumulado debido a la inactividad de su plantilla.
            </p>
          </div>
        </div>
        
        {/* SMALL STAT BOXES */}
        <div className="flex items-center gap-3 shrink-0 hidden sm:flex">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Reportes IA</p>
            <p className="text-xs font-bold font-mono text-neutral-200">{injuryAlertsOverTime.totalAlerts}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Críticos (OUT)</p>
            <p className="text-xs font-bold font-mono text-red-400">{injuryAlertsOverTime.criticalAlerts}</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMN CONTENT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART & RANKING COLUMN */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Frecuencia de Lesiones & Índice de Riesgo H2H
            </h5>
          </div>

          {/* HORIZONTAL BAR CHART */}
          <div className="bg-neutral-950/30 rounded-2xl border border-neutral-850 p-4 h-[240px] relative">
            {chartData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
                Sincroniza la liga para ver la frecuencia de lesiones.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const payload = state.activePayload[0].payload;
                      if (payload && payload.id) {
                        setSelectedTeamId(payload.id);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    stroke="#525252" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#a3a3a3" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    width={90}
                    tickFormatter={(val) => val.length > 12 ? val.slice(0, 10) + '..' : val}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#f3f4f6' }}
                    itemStyle={{ fontSize: '11px', padding: '0px' }}
                  />
                  <Bar 
                    dataKey="Lesiones" 
                    radius={[0, 4, 4, 0]}
                    barSize={12}
                  >
                    {chartData.map((entry, index) => {
                      const score = entry.raw.riskIndex;
                      let barColor = '#10b981'; // green for safe
                      if (score >= 1.5) barColor = '#f59e0b'; // amber
                      if (score >= 3.0) barColor = '#ef4444'; // red
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={barColor}
                          className="cursor-pointer hover:opacity-80 transition"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* SIMPLIFIED TABLE LIST */}
          <div className="bg-neutral-900/20 border border-neutral-850 rounded-xl divide-y divide-neutral-850 overflow-hidden">
            <div className="p-3 bg-neutral-950/40 grid grid-cols-12 gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              <div className="col-span-6">Plantilla de la Liga</div>
              <div className="col-span-3 text-center">Total Inj.</div>
              <div className="col-span-3 text-right">Índice Riesgo</div>
            </div>

            <div className="max-h-[180px] overflow-y-auto divide-y divide-neutral-850/60">
              {teamInjuryMetrics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`w-full text-left p-3 grid grid-cols-12 gap-2 items-center transition hover:bg-neutral-850/30 ${
                    selectedTeamId === t.id ? 'bg-neutral-800/40 border-l-2 border-orange-500 pl-2.5' : ''
                  }`}
                >
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="w-5 h-5 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-5 h-5 bg-neutral-800 text-[10px] flex items-center justify-center font-mono rounded shrink-0">T</span>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-neutral-200 truncate leading-tight">{t.name}</p>
                      <p className="text-[9px] text-neutral-500 truncate mt-0.5">{t.owner}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-center font-bold font-mono text-neutral-300 text-xs">
                    {t.totalInjured} <span className="text-[10px] text-neutral-600">({t.outCount} OUT)</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      t.riskCategory === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                      t.riskCategory === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                    }`}>
                      {t.riskIndex}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TEAM DETAIL INTERACTIVE PANEL */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-orange-500" />
            <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Detalle de Plantilla Afectada
            </h5>
          </div>

          <AnimatePresence mode="wait">
            {selectedTeamDetails ? (
              <motion.div
                key={selectedTeamDetails.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-neutral-950/30 border border-neutral-850 rounded-2xl p-5 space-y-4 h-full"
              >
                {/* Team meta card */}
                <div className="flex items-center gap-3 pb-3 border-b border-neutral-850">
                  {selectedTeamDetails.logo && (
                    <img src={selectedTeamDetails.logo} alt="" className="w-10 h-10 rounded-xl object-cover border border-neutral-800" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <h6 className="text-sm font-black text-neutral-200 tracking-tight leading-snug">{selectedTeamDetails.name}</h6>
                    <p className="text-[10px] text-neutral-400 font-medium">Manejador: {selectedTeamDetails.owner}</p>
                  </div>
                </div>

                {/* Score block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-xl">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Perfil de Riesgo</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-base font-black font-mono ${
                        selectedTeamDetails.riskCategory === 'HIGH' ? 'text-red-400' :
                        selectedTeamDetails.riskCategory === 'MEDIUM' ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {selectedTeamDetails.riskIndex}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase">/ 10</span>
                    </div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-xl">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Clasificación</span>
                    <div className="mt-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        selectedTeamDetails.riskCategory === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        selectedTeamDetails.riskCategory === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {selectedTeamDetails.riskCategory === 'HIGH' ? '🚨 CRÍTICO' :
                         selectedTeamDetails.riskCategory === 'MEDIUM' ? '⚠️ MODERADO' :
                         '✅ ESTABLE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Affected Players List */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Jugadores Lesionados o en Duda</p>
                  
                  {selectedTeamDetails.injuredPlayers.length === 0 ? (
                    <div className="text-center py-6 bg-neutral-900/30 rounded-xl border border-neutral-850 border-dashed">
                      <p className="text-xs text-neutral-500">¡Plantilla completamente saludable! 0 lesionados.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedTeamDetails.injuredPlayers.map((player: Player) => {
                        const isOut = player.injuryStatus === 'OUT';
                        return (
                          <div 
                            key={player.id}
                            className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-200 truncate">{player.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400">
                                <span className="font-mono bg-neutral-800 px-1 py-0.2 rounded font-semibold text-[9px]">{player.positions.join('/')}</span>
                                <span>{player.nbaTeam}</span>
                              </div>
                              {player.injuryDetails && (
                                <p className="text-[10px] text-neutral-500 italic mt-1 leading-tight truncate max-w-[190px]" title={player.injuryDetails}>
                                  {player.injuryDetails}
                                </p>
                              )}
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono shrink-0 uppercase tracking-wider ${
                              isOut ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {player.injuryStatus}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* STRATEGIC NOTE */}
                {selectedTeamDetails.riskCategory === 'HIGH' && (
                  <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-xl flex gap-2 items-start text-[10px] text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Consejo de Traspaso:</strong> Este rival está vulnerable. Sus titulares clave están fuera. Explora la pestaña <em>"Sugeridor de Traspasos"</em> para ofrecer un jugador saludable a cambio de sus estrellas lesionadas para un empuje en los playoffs.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-neutral-950/30 border border-neutral-850 rounded-2xl p-8 text-center text-xs text-neutral-500">
                Selecciona un equipo de la lista o gráfico para ver el desglose de su plantilla afectada.
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

