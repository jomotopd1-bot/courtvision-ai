import React, { useState } from 'react';
import { Player } from '../types.js';
import { Users, ArrowRightLeft } from 'lucide-react';

interface PlayerComparisonProps {
  roster: Player[];
}

export default function PlayerComparison({ roster }: PlayerComparisonProps) {
  const [playerOneId, setPlayerOneId] = useState<string>('');
  const [playerTwoId, setPlayerTwoId] = useState<string>('');

  const playerOne = roster.find(p => p.id === playerOneId);
  const playerTwo = roster.find(p => p.id === playerTwoId);

  const statsList = [
    { key: 'pts', label: 'PTS' },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'stl', label: 'STL' },
    { key: 'blk', label: 'BLK' },
    { key: 'tpm', label: '3PM' },
    { key: 'tov', label: 'TOV', inverse: true },
    { key: 'fgPct', label: 'FG%' },
    { key: 'ftPct', label: 'FT%' }
  ];

  const getStatValue = (player: Player, key: string) => {
    if (key === 'fgPct') {
      return player.stats.fga > 0 ? (player.stats.fgm / player.stats.fga) * 100 : 0;
    }
    if (key === 'ftPct') {
      return player.stats.fta > 0 ? (player.stats.ftm / player.stats.fta) * 100 : 0;
    }
    return player.stats[key as keyof Player['stats']] || 0;
  };

  const formatStat = (val: number, key: string) => {
    if (key === 'fgPct' || key === 'ftPct') {
      return val.toFixed(1) + '%';
    }
    return val.toFixed(1);
  };

  const renderComparisonRow = (stat: { key: string, label: string, inverse?: boolean }) => {
    if (!playerOne || !playerTwo) return null;
    
    const val1 = getStatValue(playerOne, stat.key);
    const val2 = getStatValue(playerTwo, stat.key);
    
    let p1Better = stat.inverse ? val1 < val2 : val1 > val2;
    let p2Better = stat.inverse ? val2 < val1 : val2 > val1;
    
    if (val1 === val2) {
      p1Better = false;
      p2Better = false;
    }

    return (
      <div key={stat.key} className="grid grid-cols-3 items-center py-3 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
        <div className={`text-center font-mono text-sm ${p1Better ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}>
          {formatStat(val1, stat.key)}
        </div>
        <div className="text-center font-bold text-neutral-300 text-xs tracking-wider">
          {stat.label}
        </div>
        <div className={`text-center font-mono text-sm ${p2Better ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}>
          {formatStat(val2, stat.key)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <ArrowRightLeft className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Comparación de Jugadores</h2>
          <p className="text-sm text-neutral-400">Compara las estadísticas promedio de dos jugadores de tu plantilla actual.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Selector 1 */}
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-neutral-400 uppercase">Jugador 1</label>
          <select 
            value={playerOneId} 
            onChange={(e) => setPlayerOneId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
          >
            <option value="">Selecciona un jugador...</option>
            {roster.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === playerTwoId}>{p.name}</option>
            ))}
          </select>

          {playerOne && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-neutral-400">
                {playerOne.name.charAt(0)}
              </div>
              <h3 className="font-bold text-neutral-100">{playerOne.name}</h3>
              <p className="text-xs text-neutral-400">{playerOne.nbaTeam} • {playerOne.positions.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Stats Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="bg-neutral-900 py-3 grid grid-cols-3 text-xs font-bold text-neutral-400 text-center border-b border-neutral-800">
            <div>JUGADOR 1</div>
            <div>ESTADÍSTICA</div>
            <div>JUGADOR 2</div>
          </div>
          
          <div className="px-4">
            {(!playerOne || !playerTwo) ? (
              <div className="py-12 text-center text-neutral-500 text-sm flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-20" />
                <p>Selecciona dos jugadores<br/>para ver la comparación</p>
              </div>
            ) : (
              <div className="py-2">
                {statsList.map(renderComparisonRow)}
              </div>
            )}
          </div>
        </div>

        {/* Selector 2 */}
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-neutral-400 uppercase">Jugador 2</label>
          <select 
            value={playerTwoId} 
            onChange={(e) => setPlayerTwoId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
          >
            <option value="">Selecciona un jugador...</option>
            {roster.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === playerOneId}>{p.name}</option>
            ))}
          </select>

          {playerTwo && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-neutral-400">
                {playerTwo.name.charAt(0)}
              </div>
              <h3 className="font-bold text-neutral-100">{playerTwo.name}</h3>
              <p className="text-xs text-neutral-400">{playerTwo.nbaTeam} • {playerTwo.positions.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
