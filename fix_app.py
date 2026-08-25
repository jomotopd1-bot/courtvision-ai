import re

with open("src/App.tsx", "r") as f:
    text = f.read()

my_team_logic = """  const myTeamId = league ? myTeamIds[league.id] : undefined;
  const myTeam = league?.teams.find(t => t.id === myTeamId) || null;

  const selectedTeam = league?.teams.find(t => t.id === selectedTeamId) || null;
"""
text = re.sub(r"  const selectedTeam = league\?.teams.find.*?null;\n", my_team_logic, text, count=1)

opponent_logic = """  const currentMatchup = league?.matchups.find(m => 
    myTeamId && (m.homeTeamId === myTeamId || m.awayTeamId === myTeamId) && 
    m.matchupPeriod === league.currentPeriod
  );

  const opponentTeamId = currentMatchup 
    ? (currentMatchup.homeTeamId === myTeamId ? currentMatchup.awayTeamId : currentMatchup.homeTeamId) 
    : null;
  const opponentTeam = league?.teams.find(t => t.id === opponentTeamId) || null;
"""
text = re.sub(r"  const currentMatchup = league\?.matchups.*?\|\| null;\n", opponent_logic, text, flags=re.DOTALL)

# Roster view stays selectedTeam? Wait, LineupOptimizer uses recommendations? If they want it ALL on myTeam, I should use myTeam for everything except maybe viewing rosters.
# Let's change `selectedTeam` to `myTeam` for compare, waiver, opponent. Roster can stay `selectedTeam` so they can still browse other teams' rosters.

compare_tab = """                {activeTab === 'compare' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {myTeam ? <PlayerComparison roster={myTeam.roster} /> : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}"""
text = re.sub(r"                \{activeTab === 'compare'.*?<\/motion.div>\n                \)}", compare_tab, text, flags=re.DOTALL)

waiver_tab = """                {activeTab === 'waiver' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {myTeam ? <WaiverWire roster={myTeam.roster} categoryPrefs={categoryPrefs} /> : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}"""
text = re.sub(r"                \{activeTab === 'waiver'.*?<\/motion.div>\n                \)}", waiver_tab, text, flags=re.DOTALL)

opponent_tab = """                {activeTab === 'opponent' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {!myTeam ? (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    ) : opponentTeam ? (
                      <OpponentForecast userTeam={myTeam} opponentTeam={opponentTeam} categoryPrefs={categoryPrefs} />
                    ) : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
                        <h4 className="text-sm font-bold text-neutral-200">{language === 'es' ? 'No se encontró rival para esta semana' : 'No opponent found for this week'}</h4>
                        <p className="text-xs text-neutral-400">
                          {language === 'es' ? 'No hay ningún enfrentamiento registrado en la liga para tu equipo en la semana actual.' : 'There is no matchup registered in the league for your team this week.'}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}"""
text = re.sub(r"                \{activeTab === 'opponent'.*?<\/motion.div>\n                \)}", opponent_tab, text, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(text)

