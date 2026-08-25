import re

with open("src/App.tsx", "r") as f:
    text = f.read()

roster_tab = """                {activeTab === 'roster' && selectedTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <TeamWeeklyChart roster={selectedTeam.roster} teamName={selectedTeam.name} categoryPrefs={categoryPrefs} />
                    <RosterList roster={selectedTeam.roster} teamName={selectedTeam.name} categoryPrefs={categoryPrefs} />
                    {(!myTeamId || selectedTeam.id === myTeamId) ? (
                      <LineupOptimizer roster={selectedTeam.roster} teamName={selectedTeam.name} />
                    ) : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 text-center">
                        <p className="text-neutral-500 text-sm">{language === 'es' ? 'La optimización de alineación (IA) solo está disponible para tu equipo principal.' : 'AI Lineup Optimization is only available for your main team.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}"""

text = re.sub(r"                \{activeTab === 'roster'.*?<\/motion.div>\n                \)}", roster_tab, text, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(text)

