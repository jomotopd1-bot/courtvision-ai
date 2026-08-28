import { useState, useMemo } from 'react';
import { Sparkles, ArrowLeftRight, Trash2, Plus, Brain, CheckCircle2, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { FantasyTeam, Player, TradeSuggestion } from '../types.js';
import { motion, AnimatePresence } from 'motion/react';

interface ManualTradeAnalyzerProps {
  teams: FantasyTeam[];
  myTeamId?: string;
  getFullUrl?: (path: string) => string;
  onClose: () => void;
}

export default function ManualTradeAnalyzer({ teams, myTeamId, getFullUrl = (p) => p, onClose }: ManualTradeAnalyzerProps) {
  const [proposerTeamId, setProposerTeamId] = useState(myTeamId || teams[0]?.id || '');
  const [receiverTeamId, setReceiverTeamId] = useState(teams.find(t => t.id !== (myTeamId || teams[0]?.id))?.id || '');

  const [proposerPicks, setProposerPicks] = useState<string[]>([]);
  const [receiverPicks, setReceiverPicks] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TradeSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proposerTeam = useMemo(() => teams.find(t => t.id === proposerTeamId), [teams, proposerTeamId]);
  const receiverTeam = useMemo(() => teams.find(t => t.id === receiverTeamId), [teams, receiverTeamId]);

  const handleAnalyze = async () => {
    if (!proposerTeam || !receiverTeam || !proposerPicks.length || !receiverPicks.length) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const proposerSends = proposerTeam.roster.filter(p => proposerPicks.includes(p.id));
    const receiverSends = receiverTeam.roster.filter(p => receiverPicks.includes(p.id));

    try {
      const response = await fetch(getFullUrl('/api/analyze/trade/manual'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposerSends,
          receiverSends,
          proposerTeamName: proposerTeam.name,
          receiverTeamName: receiverTeam.name
        })
      });

      if (!response.ok) throw new Error('Error al analizar el intercambio.');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayer = (id: string, side: 'proposer' | 'receiver') => {
    if (side === 'proposer') {
      setProposerPicks(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setReceiverPicks(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/20">
            <ArrowLeftRight className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Analizador Manual de Ofertas</h3>
            <p className="text-xs text-neutral-400">Evalúa con IA si un intercambio que recibiste te conviene.</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition text-neutral-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* LADO A: TU EQUIPO (O PROPONENTE) */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Equipo A (Tú envías)</label>
          <select
            value={proposerTeamId}
            onChange={(e) => { setProposerTeamId(e.target.value); setProposerPicks([]); }}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 transition"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.owner})</option>)}
          </select>

          <div className="bg-black/50 border border-neutral-800 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {proposerTeam?.roster.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id, 'proposer')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  proposerPicks.includes(p.id) ? 'bg-orange-600/10 border-orange-500/50 text-white' : 'bg-transparent border-transparent text-neutral-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-orange-500">{p.positions[0]}</span>
                  <span className="text-xs font-bold">{p.name}</span>
                </div>
                {proposerPicks.includes(p.id) && <Plus className="w-4 h-4 rotate-45" />}
              </button>
            ))}
          </div>
        </div>

        {/* LADO B: EL OTRO EQUIPO */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Equipo B (Tú recibes)</label>
          <select
            value={receiverTeamId}
            onChange={(e) => { setReceiverTeamId(e.target.value); setReceiverPicks([]); }}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 transition"
          >
            {teams.filter(t => t.id !== proposerTeamId).map(t => <option key={t.id} value={t.id}>{t.name} ({t.owner})</option>)}
          </select>

          <div className="bg-black/50 border border-neutral-800 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {receiverTeam?.roster.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id, 'receiver')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  receiverPicks.includes(p.id) ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-transparent border-transparent text-neutral-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-blue-500">{p.positions[0]}</span>
                  <span className="text-xs font-bold">{p.name}</span>
                </div>
                {receiverPicks.includes(p.id) && <Plus className="w-4 h-4 rotate-45" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !proposerPicks.length || !receiverPicks.length}
          className={`group flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all ${
            isLoading || !proposerPicks.length || !receiverPicks.length
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-xl shadow-orange-600/20 hover:scale-105 active:scale-95'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Brain className="w-5 h-5 group-hover:animate-pulse" />
              Evaluar con Gemini
            </>
          )}
        </button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-6 space-y-6 border-t border-neutral-800 pt-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <h4 className="text-lg font-black text-white italic uppercase tracking-tight">Análisis Final</h4>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
                  result.mlAnalysis.verdict === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  result.mlAnalysis.verdict === 'FAVORABLE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {result.mlAnalysis.verdict}
                </div>
              </div>

              <div className="p-5 bg-neutral-950/50 border border-neutral-800 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-600"></div>
                <p className="text-sm text-neutral-200 leading-relaxed italic">"{result.mlAnalysis.summary}"</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Impacto Proponente</p>
                  <p className="text-xs text-neutral-300">{result.mlAnalysis.proposerBenefit}</p>
                  <div className="mt-2 flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    +{result.mlAnalysis.scoreChangeProposer}%
                  </div>
                </div>
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Impacto Receptor</p>
                  <p className="text-xs text-neutral-300">{result.mlAnalysis.receiverBenefit}</p>
                  <div className="mt-2 flex items-center gap-1 text-blue-400 font-mono font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    +{result.mlAnalysis.scoreChangeReceiver}%
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-neutral-700"
                >
                  Volver al Panel Principal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </motion.div>
  );
}
