import re

with open("src/components/MyTeamEditor.tsx", "r") as f:
    text = f.read()

# Modify imports
text = text.replace("import { Player, FantasyTeam } from '../types.js';", "import { Player, FantasyTeam, League } from '../types.js';")
text = text.replace("import { UserMinus, UserPlus, Save, X, Edit2 } from 'lucide-react';", "import { UserMinus, UserPlus, Save, X, Edit2, Star } from 'lucide-react';")

# Modify interface
new_interface = """interface MyTeamEditorProps {
  league: League;
  myTeamId?: string;
  onSetMyTeam: (teamId: string) => void;
  onUpdateTeam: (updatedTeam: FantasyTeam) => void;
  language: 'es' | 'en';
}"""
text = re.sub(r"interface MyTeamEditorProps \{.*?\n\}", new_interface, text, flags=re.DOTALL)

# Modify component signature
text = text.replace("export default function MyTeamEditor({ team, onUpdateTeam, language }: MyTeamEditorProps) {", "export default function MyTeamEditor({ league, myTeamId, onSetMyTeam, onUpdateTeam, language }: MyTeamEditorProps) {\n  const team = myTeamId ? league.teams.find(t => t.id === myTeamId) : null;")

# Add a check for if no team is selected
header = """      <div className="flex items-center justify-between mb-6">
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
"""

old_header = """      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-orange-500" />
            {language === 'es' ? 'Editar Mi Equipo' : 'Edit My Team'} - {team.name}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {language === 'es' ? 'Gestiona tu plantilla, añade o elimina jugadores.' : 'Manage your roster, add or remove players.'}
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          {language === 'es' ? 'Añadir Jugador' : 'Add Player'}
        </button>
      </div>"""

text = text.replace(old_header, header)

# Deal with optional team
# In handleAddPlayer and handleRemovePlayer, check if team exists
text = text.replace("team.roster.filter", "team?.roster.filter")
text = text.replace("onUpdateTeam({ ...team, roster: updatedRoster });", "if (team) onUpdateTeam({ ...team, roster: updatedRoster });")
text = text.replace("onUpdateTeam({ ...team, roster: [...team.roster, newPlayer] });", "if (team) onUpdateTeam({ ...team, roster: [...team.roster, newPlayer] });")

# Wrap the roster section in if (team)
roster_section = """      {team ? (
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
      )}"""

text = re.sub(r"      <div className=\"space-y-2\">.*?\n      </div>", roster_section, text, flags=re.DOTALL)

with open("src/components/MyTeamEditor.tsx", "w") as f:
    f.write(text)
