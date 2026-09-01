import { Trophy, Users, ShieldAlert } from 'lucide-react';
import { FantasyTeam } from '../types';

interface StandingsProps {
  teams: FantasyTeam[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export default function Standings({ teams = [], selectedTeamId, onSelectTeam }: StandingsProps) {
  // Sort teams by ranking
  const sortedTeams = [...(teams || [])].sort((a, b) => (a?.ranking || 0) - (b?.ranking || 0));

  return (
    <div id="standings-card" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-neutral-100 tracking-tight">Clasificación de la Liga</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-xs text-neutral-400 font-semibold uppercase">
              <th className="pb-3 pl-2 w-12 text-center">Pos</th>
              <th className="pb-3">Equipo / Manager</th>
              <th className="pb-3 text-center">Récord</th>
              <th className="pb-3 text-center text-neutral-500">Pct %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {sortedTeams.map((team) => {
              if (!team) return null;
              const isSelected = team.id === selectedTeamId;
              const wins = team.record?.wins || 0;
              const losses = team.record?.losses || 0;
              const ties = team.record?.ties || 0;
              const totalGames = wins + losses + ties;
              const pct = totalGames > 0 ? ((wins + ties * 0.5) / totalGames).toFixed(3) : '.000';
              const isUserTeam = team.id === 'team_user' || (team.owner || '').includes('Tú');

              return (
                <tr
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isSelected ? 'bg-orange-500/10' : 'hover:bg-neutral-800/30'
                  }`}
                >
                  <td className="py-3.5 pl-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                        team.ranking === 1
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : team.ranking === 2
                          ? 'bg-neutral-800 text-neutral-300'
                          : team.ranking === 3
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-neutral-400'
                      }`}
                    >
                      {team.ranking}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        referrerPolicy="no-referrer"
                        src={team.logo || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100'}
                        alt={team.name}
                        className="w-8 h-8 rounded-lg object-cover bg-neutral-800 border border-neutral-800"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-neutral-100 truncate group-hover:text-orange-400 transition-colors">
                            {team.name}
                          </p>
                          {isUserTeam && (
                            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded">
                              TÚ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate flex items-center gap-1">
                          <Users className="w-3 h-3 text-neutral-500" />
                          {team.owner}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center font-mono text-sm text-neutral-200">
                    {team.record.wins}-{team.record.losses}-{team.record.ties}
                  </td>
                  <td className="py-3.5 text-center font-mono text-xs text-neutral-500">
                    {pct}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-neutral-500" />
        <span>Haz clic en cualquier fila para inspeccionar su plantel y proponer un intercambio con IA.</span>
      </div>
    </div>
  );
}

