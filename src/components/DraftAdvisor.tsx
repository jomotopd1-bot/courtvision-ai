import { useState, useEffect } from 'react';
import { Sparkles, Brain, Compass, HelpCircle, TrendingUp, UserPlus, Info, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { DraftRecommendation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TOP_PLAYERS } from '../data/topPlayers';

export default function DraftAdvisor({ getFullUrl = (p: string) => p }: { getFullUrl?: (p: string) => string }) {
  const [strategy, setStrategy] = useState<'Equilibrada' | 'Punt PTS' | 'Punt AST'>('Equilibrada');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<DraftRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState('Analizando tendencias del draft...');
  const [draftedPlayers, setDraftedPlayers] = useState<string[]>([]);
  const [draftPlayerInput, setDraftPlayerInput] = useState('');
  const [watchlist, setWatchlist] = useState<{name: string}[]>([]);
  const [watchlistInput, setWatchlistInput] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  
  const availablePlayers = TOP_PLAYERS.filter(p => !draftedPlayers.includes(p.name));
  const filteredAvailablePlayers = availablePlayers.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()) || p.team.toLowerCase().includes(playerSearch.toLowerCase()));



  const phrases = [
    'Consultando motores de búsqueda de Google...',
    'Buscando reportes recientes de la Summer League y entrenamientos...',
    'Analizando proyecciones avanzadas de novatos (2027)...',
    'Identificando sleepers infravalorados en los rankings de ESPN...',
    'Calculando impacto estadístico por minuto de juego...',
    'Sintetizando la estrategia de reducción seleccionada...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % phrases.length;
        setLoadingPhrase(phrases[idx]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load initial recommendation on mount or change strategy
  useEffect(() => {
    handleFetchRecommendation(strategy);
  }, []);

  const handleFetchRecommendation = async (selectedStrat: typeof strategy) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getFullUrl('/api/analyze/draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: selectedStrat, draftedPlayers }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudieron obtener las recomendaciones de draft.');
      }
      const data = await response.json();
      setRecommendation(data);
    } catch (err: any) {
      setError(err.message || 'Error de red.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStrategyChange = (newStrat: typeof strategy) => {
    setStrategy(newStrat);
    handleFetchRecommendation(newStrat);
  };

  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;

      if (trimmed.startsWith('####')) {
        return (
          <h5 key={i} className="text-sm font-bold text-orange-400 mt-4 mb-2">
            {trimmed.replace('####', '').trim()}
          </h5>
        );
      }
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={i} className="text-base font-bold text-white mt-5 mb-2 border-b border-neutral-800 pb-1">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={i} className="text-lg font-extrabold text-white mt-6 mb-3">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('* **') || trimmed.startsWith('- **') || trimmed.match(/^\d+\.\s+\*\*/)) {
        const matches = trimmed.match(/^(?:[\*\-]\s+|\d+\.\s+)\*\*(.*?)\*\*(.*)/);
        if (matches) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2 my-1.5 text-xs text-neutral-300">
              <span className="text-orange-500 mt-1 shrink-0">•</span>
              <p>
                <strong className="text-white font-semibold">{matches[1]}</strong>
                {matches[2]}
              </p>
            </div>
          );
        }
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <div key={i} className="flex items-start gap-2 ml-4 my-1 text-xs text-neutral-300">
            <span className="text-neutral-500 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
            <p>{trimmed.substring(1).trim()}</p>
          </div>
        );
      }
      return (
        <p key={i} className="text-xs text-neutral-400 leading-relaxed mb-2.5">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div id="draft-advisor-workspace" className="space-y-6">

      {/* DRAFT PROGRESS BAR */}
      <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Progreso del Draft
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Ronda actual y estado general de las selecciones de la liga.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80">
              <span className="text-neutral-500 mr-2">RONDA</span>
              <span className="text-orange-400 font-bold">{Math.floor(draftedPlayers.length / 10) + 1}</span><span className="text-neutral-600">/15</span>
            </div>
            <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80">
              <span className="text-neutral-500 mr-2">PICK</span>
              <span className="text-white font-bold">{draftedPlayers.length + 1}</span><span className="text-neutral-600">/150</span>
            </div>
            <div className="bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
              <span className="text-orange-500/70 mr-2">RONDAS FALTANTES</span>
              <span className="text-orange-400 font-bold">{Math.max(0, 15 - Math.floor(draftedPlayers.length / 10))}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-neutral-500">
            <span>Inicio</span>
            <span>Promedio Liga (Ronda {Math.floor(draftedPlayers.length / 10) + 1})</span>
            <span>Fin (150 Picks)</span>
          </div>
          <div className="h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (draftedPlayers.length / 150) * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ animation: 'shimmer 2s infinite' }}></div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-600/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                AI Draft Agent
              </span>
              {recommendation?.modelUsed === 'offline-analytics' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[9px] text-amber-500 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                    FALLBACK: MOTOR DE SELECCIÓN LOCAL
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    SISTEMA IA: {(recommendation?.modelUsed || 'GEMINI-3.5-FLASH').toUpperCase()}
                  </span>
                </>
              )}
            </div>
            <h3 className="text-lg font-bold text-neutral-100 tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-orange-500" />
              Asesor de Draft Inteligente IA
            </h3>
            <p className="text-xs text-neutral-400">
              Optimiza tus selecciones de draft con recomendaciones personalizadas obtenidas mediante <strong className="text-orange-400">Google Search Grounding</strong>.
            </p>
          </div>

          {/* STRATEGY CHOOSER */}
          <div className="flex flex-wrap gap-2">
            {(['Equilibrada', 'Punt PTS', 'Punt AST'] as const).map((strat) => (
              <button
                key={strat}
                onClick={() => handleStrategyChange(strat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  strategy === strat
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {strat === 'Equilibrada' ? '📊 Equilibrada (General)' : strat === 'Punt PTS' ? '🎯 Reducción: Ignorar PTS' : '🏃‍♂️ Reducción: Ignorar AST'}
              </button>
            ))}
          </div>
        </div>

        {/* INFO BOX ABOUT THE STRATEGY */}
        <div className="mt-4 p-4.5 bg-neutral-950/40 border border-neutral-800 rounded-xl flex gap-3.5 items-start">
          <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-neutral-200">
              {strategy === 'Equilibrada' && 'Estrategia Equilibrada (Balanced Draft)'}
              {strategy === 'Punt PTS' && 'Estrategia de Reducción de Puntos (Punt Points)'}
              {strategy === 'Punt AST' && 'Estrategia de Reducción de Asistencias (Punt Assists)'}
            </p>
            <p className="text-neutral-400 leading-relaxed">
              {strategy === 'Equilibrada' && 'Maximiza el valor general seleccionando los mejores jugadores disponibles (BPA) por ronda. Ideal para adaptarte dinámicamente según avance el borrador.'}
              {strategy === 'Punt PTS' && 'Ignora los puntos anotados por completo. El valor de especialistas en asistencias, robos, bloqueos y rebotes se incrementa sustancialmente.'}
              {strategy === 'Punt AST' && 'Ignora las asistencias. Te permite obviar la necesidad de bases caros que elevan tus pérdidas de balón, y acumular artilleros de triples y pívots eficientes.'}
            </p>
          </div>
        </div>
      </div>

      {/* ERROR HANDLER */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => handleFetchRecommendation(strategy)} className="underline ml-auto font-bold hover:text-red-300">Reintentar</button>
        </div>
      )}

      {/* PLAYER POOL & WATCHLIST */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* Pool de Jugadores */}
        <div className="flex-[2] bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800 flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-neutral-200 mb-2 flex items-center gap-2 shrink-0">
            <Search className="w-4 h-4 text-orange-500" />
            Jugadores Disponibles (Player Pool)
          </h3>
          <p className="text-[11px] text-neutral-400 mb-4 shrink-0">
            Selecciona jugadores para marcarlos como drafteados por otros equipos, o añádelos a tu lista de pre-selección (queue).
          </p>
          <div className="mb-4 shrink-0">
            <input 
              type="text" 
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              placeholder="Buscar por nombre o equipo (ej. Jokic, DEN)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              {filteredAvailablePlayers.map((player) => {
                const inWatchlist = watchlist.some(w => w.name === player.name);
                return (
                  <div key={player.name} className="flex items-center justify-between bg-neutral-950/50 border border-neutral-800/80 p-3 rounded-xl hover:border-orange-500/30 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {player.name}
                        <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono uppercase">{player.pos}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5 uppercase">{player.team}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!inWatchlist) setWatchlist([{name: player.name}, ...watchlist]);
                        }}
                        disabled={inWatchlist}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors ${inWatchlist ? 'bg-orange-500/20 text-orange-500 opacity-50 cursor-not-allowed' : 'bg-neutral-800 hover:bg-orange-600 text-neutral-300 hover:text-white'}`}
                      >
                        {inWatchlist ? 'En Queue' : '+ Queue'}
                      </button>
                      <button
                        onClick={() => {
                          setDraftedPlayers([...draftedPlayers, player.name]);
                          setWatchlist(watchlist.filter(w => w.name !== player.name));
                        }}
                        className="bg-neutral-800 hover:bg-red-500/80 hover:text-white text-neutral-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Marcar Tomado
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredAvailablePlayers.length === 0 && (
                <div className="text-center text-sm text-neutral-500 py-4">No se encontraron jugadores.</div>
              )}
            </div>
          </div>
        </div>

        {/* Listas (Watchlist & Drafted) */}
        <div className="flex-1 flex flex-col gap-4 h-[400px]">
          {/* Watchlist */}
          <div className="flex-1 bg-orange-950/20 p-5 rounded-2xl border border-orange-900/30 flex flex-col overflow-hidden">
            <h3 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-orange-500" />
              Mi Pre-selección (Queue)
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {watchlist.length > 0 ? (
                <div className="flex flex-col gap-2 mt-2">
                  {watchlist.map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-900/80 border border-orange-500/20 px-3 py-2 rounded-lg group">
                      <div className="flex items-center gap-3">
                        <div className="text-orange-500/50 font-mono text-[10px] w-4 text-center">{idx+1}</div>
                        <span className="text-sm font-bold text-neutral-200">{player.name}</span>
                      </div>
                      <button 
                        onClick={() => setWatchlist(watchlist.filter((_, i) => i !== idx))}
                        className="text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic mt-2">Tu lista está vacía. Añade jugadores del pool.</div>
              )}
            </div>
          </div>
          
          {/* Drafted */}
          <div className="flex-1 bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800 flex flex-col overflow-hidden">
            <h3 className="text-sm font-bold text-neutral-400 mb-2 flex items-center gap-2 shrink-0">
              <UserPlus className="w-4 h-4 text-neutral-500" />
              Ya Drafteados
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {draftedPlayers.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-2">
                  {draftedPlayers.slice().reverse().map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-950 border border-neutral-800/80 px-2 py-1.5 rounded-lg group">
                      <span className="text-xs text-neutral-400 line-through">{player}</span>
                      <button 
                        onClick={() => setDraftedPlayers(draftedPlayers.filter(p => p !== player))}
                        className="text-neutral-600 hover:text-neutral-300 text-[10px] transition-colors"
                      >
                        Deshacer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic mt-2">Ningún jugador marcado como tomado aún.</div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* TABLA DE CONTEXTO DE RIVALES */}
      {draftedPlayers.length > 0 && (
        <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-5 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-500" />
                Contexto de Rivales (Últimas 3 Rondas)
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Las últimas 30 selecciones para entender qué posiciones están buscando los otros equipos.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/50">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase text-neutral-500 bg-neutral-900/50">
                  <th className="py-2.5 px-4 font-bold w-16">Pick</th>
                  <th className="py-2.5 px-4 font-bold">Jugador</th>
                  <th className="py-2.5 px-4 font-bold w-24">Posición</th>
                  <th className="py-2.5 px-4 font-bold w-24">Equipo</th>
                </tr>
              </thead>
              <tbody className="text-xs text-neutral-300">
                {draftedPlayers.slice(-30).reverse().map((playerName, index) => {
                  const pickNumber = draftedPlayers.length - index;
                  const playerInfo = TOP_PLAYERS.find(p => p.name === playerName);
                  return (
                    <tr key={pickNumber} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="py-2 px-4 font-mono text-neutral-500 text-[10px]">{pickNumber}</td>
                      <td className="py-2 px-4 font-semibold text-neutral-200">{playerName}</td>
                      <td className="py-2 px-4">
                        <span className="bg-neutral-800/80 border border-neutral-700/50 text-neutral-400 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase">
                          {playerInfo ? playerInfo.pos : 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-[10px] text-neutral-500 uppercase font-mono">{playerInfo ? playerInfo.team : 'FA'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-bold text-white">Recomendaciones de IA</h3>
        <button
          onClick={() => handleFetchRecommendation(strategy)}
          disabled={isLoading}
          className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-700"
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Brain className="w-3.5 h-3.5" />
          )}
          Actualizar Análisis
        </button>
      </div>

      {/* WORKSPACE CONTENT AREA */}
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-advisor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center space-y-4"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-orange-500/10 opacity-30 animate-ping"></span>
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-neutral-200 animate-pulse">Sintonizando ESPN Neural Engine...</h4>
                <p className="text-xs text-neutral-400">{loadingPhrase}</p>
              </div>
            </motion.div>
          ) : (
            recommendation && (
              <motion.div
                key="recommendation-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* COLUMN 1 & 2: RECO CARDS */}
                <div className="lg:col-span-2 space-y-6">
                  {/* RECOMMENDED PICKS */}
                  {recommendation.recommendedPicks && recommendation.recommendedPicks.length > 0 && (
                    <div className="bg-orange-950/20 border border-orange-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                      <h4 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-orange-500" />
                        Top 20 Selecciones Recomendadas
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {recommendation.recommendedPicks.map((pick, idx) => (
                          <div
                            key={`pick-${idx}`}
                            className="bg-neutral-900 border border-neutral-800/80 p-4 rounded-xl hover:border-orange-500/40 transition duration-200"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div>
                                <h5 className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span className="text-orange-500/70 text-xs font-mono">{idx + 1}.</span> {pick.name}
                                </h5>
                                <p className="text-[10px] text-neutral-500 font-mono uppercase">{pick.team}</p>
                              </div>
                              <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 text-[10px] font-extrabold text-orange-400 rounded-lg">
                                {pick.expectedRound}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed font-light">
                              {pick.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SLEEPERS GRID */}
                  <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      Robos del Draft & Sleepers Recomendados
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Jugadores infravalorados cuyo ADP (Average Draft Position) actual es significativamente menor que su valor real de producción.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendation.sleepers.map((sleeper, idx) => (
                        <div
                          key={`sleeper-${idx}`}
                          className="bg-neutral-900 border border-neutral-800/80 p-4.5 rounded-xl hover:border-orange-500/30 transition duration-200 space-y-2.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-white text-xs group-hover:text-orange-400 transition-colors">
                                {sleeper.name}
                              </h5>
                              <p className="text-[10px] text-neutral-500 font-mono uppercase">{sleeper.team}</p>
                            </div>
                            <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-[10px] font-extrabold text-orange-400 rounded-lg">
                              {sleeper.expectedRound}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 leading-relaxed font-light">
                            {sleeper.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BREAKOUTS & ROOKIES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* IMPACT ROOKIES */}
                    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h4 className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-500" />
                        Novatos (Rookies) con Impacto Inmediato
                      </h4>
                      <div className="space-y-4">
                        {recommendation.rookies.map((rookie, idx) => (
                          <div
                            key={`rookie-${idx}`}
                            className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl hover:border-emerald-500/20 transition-all duration-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-white text-xs">{rookie.name}</h5>
                                <span className="text-[9px] text-neutral-500 font-mono uppercase">{rookie.team}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 rounded">
                                {rookie.expectedRound}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed font-light">{rookie.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BREAKOUT CANDIDATES */}
                    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h4 className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Candidatos a Explotar (Breakouts)
                      </h4>
                      <div className="space-y-4">
                        {recommendation.breakouts.map((breakout, idx) => (
                          <div
                            key={`breakout-${idx}`}
                            className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl hover:border-yellow-500/20 transition-all duration-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-white text-xs">{breakout.name}</h5>
                                <span className="text-[9px] text-neutral-500 font-mono uppercase">{breakout.team}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-bold text-yellow-400 rounded">
                                {breakout.expectedRound}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed font-light">{breakout.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: ANALYSIS & TIPS */}
                <div className="space-y-6">
                  {/* SUMMARY EXECUTIVE */}
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
                    <h4 className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                      <Brain className="w-4 h-4 text-orange-500" />
                      Análisis Estratégico IA
                    </h4>
                    <div className="text-xs text-neutral-300 leading-relaxed select-text prose prose-invert prose-orange">
                      {renderFormattedMarkdown(recommendation.summary)}
                    </div>
                  </div>

                  {/* SPECIFIC STRATEGY ADVICE */}
                  <div className="bg-orange-600/10 border border-orange-500/20 rounded-2xl p-6 space-y-4">
                    <h4 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      Tácticas de Ejecución
                    </h4>
                    <div className="text-xs text-neutral-300 leading-relaxed select-text">
                      {renderFormattedMarkdown(recommendation.puntStrategyAdvice)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

