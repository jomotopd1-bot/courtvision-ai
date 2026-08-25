import React, { useState } from 'react';
import { Player, FantasyTeam, League } from '../types.js';
import { UserMinus, UserPlus, Save, X, Edit2, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface MyTeamEditorProps {
  league: League;
  myTeamId?: string;
  onSetMyTeam: (teamId: string) => void;
  onUpdateTeam: (updatedTeam: FantasyTeam) => void;
  language: 'es' | 'en';
}

export default function MyTeamEditor({ league, myTeamId, onSetMyTeam, onUpdateTeam, language }: MyTeamEditorProps) {
  const team = myTeamId ? league.teams.find(t => t.id === myTeamId) : null;
  const [isAdding, setIsAdding] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState('PG');
  const [newPlayerTeam, setNewPlayerTeam] = useState('LAL');

  const handleRemovePlayer = (playerId: string) => {
    const updatedRoster = team?.roster.filter(p => p.id !== playerId);
    if (team) onUpdateTeam({ ...team, roster: updatedRoster });
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newPlayer: Player = {
      id: `custom-${Date.now()}`,
      name: newPlayerName,
      nbaTeam: newPlayerTeam,
      positions: [newPlayerPos],
      injuryStatus: 'ACTIVE',
      stats: {
        pts: Math.floor(Math.random() * 20) + 5,
        ast: Math.floor(Math.random() * 8) + 1,
        reb: Math.floor(Math.random() * 10) + 2,
        stl: Math.floor(Math.random() * 2),
        blk: Math.floor(Math.random() * 2),
        tov: Math.floor(Math.random() * 3),
        fgm: 5, fga: 10, ftm: 2, fta: 3, tpm: 1
      },
      projections: {
        pts: Math.floor(Math.random() * 20) + 5,
        ast: Math.floor(Math.random() * 8) + 1,
        reb: Math.floor(Math.random() * 10) + 2,
        stl: Math.floor(Math.random() * 2),
        blk: Math.floor(Math.random() * 2),
        tpm: 1
      }
    };

    if (team) onUpdateTeam({ ...team, roster: [...team.roster, newPlayer] });
    setIsAdding(false);
    setNewPlayerName('');
  };

  return (
    <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-orange-500" />
            {language === 'es' ? 'Editar Mi Equipo' : 'Edit My Team'} {team ? `- ${team.name}` : ''}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {language === 'es' ? 'Gestiona tu plantilla, añade o elimina jugadores.' : 'Manage your roster, add or remove players.'}
          </p>
        </div>
        {team && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            {language === 'es' ? 'Añadir Jugador' : 'Add Player'}
          </button>
        )}
      </div>
      
      <div className="mb-6 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          {language === 'es' ? 'Seleccionar mi equipo permanente' : 'Select my permanent team'}
        </label>
        <select
          value={myTeamId || ''}
          onChange={(e) => onSetMyTeam(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
        >
          <option value="" disabled>{language === 'es' ? '-- Elige tu equipo --' : '-- Choose your team --'}</option>
          {league.teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>


      {isAdding && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4"
          onSubmit={handleAddPlayer}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-200">
              {language === 'es' ? 'Nuevo Jugador' : 'New Player'}
            </h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase">
                {language === 'es' ? 'Nombre' : 'Name'}
              </label>
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                placeholder="Ej. LeBron James"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase">
                {language === 'es' ? 'Equipo NBA' : 'NBA Team'}
              </label>
              <select
                value={newPlayerTeam}
                onChange={e => setNewPlayerTeam(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {['LAL', 'BOS', 'GSW', 'MIA', 'NYK', 'DAL', 'DEN', 'PHX', 'LAC', 'MIL', 'PHI', 'CHI'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase">
                {language === 'es' ? 'Posición' : 'Position'}
              </label>
              <select
                value={newPlayerPos}
                onChange={e => setNewPlayerPos(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {['PG', 'SG', 'SF', 'PF', 'C'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {language === 'es' ? 'Guardar' : 'Save'}
            </button>
          </div>
        </motion.form>
      )}

      {team ? (
        <div className="space-y-2">
          {team.roster.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">
              {language === 'es' ? 'No hay jugadores en tu equipo.' : 'No players in your team.'}
            </p>
          ) : (
            team.roster.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-900 text-neutral-300 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-800">
                    {player.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-200">{player.name}</h4>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-bold">{player.nbaTeam}</span>
                      <span className="text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/10 font-bold">{player.positions.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                  title={language === 'es' ? 'Eliminar jugador' : 'Remove player'}
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-neutral-500 font-medium">
            {language === 'es' ? 'Selecciona un equipo arriba para empezar a editar.' : 'Select a team above to start editing.'}
          </p>
        </div>
      )}
    </div>
  );
}
