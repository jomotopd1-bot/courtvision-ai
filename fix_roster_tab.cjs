const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const searchStr = `{activeTab === 'roster' && myTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <TeamWeeklyChart roster={myTeam.roster} teamName={myTeam.name} categoryPrefs={categoryPrefs} />
                    <RosterList roster={myTeam.roster} teamName={myTeam.name} categoryPrefs={categoryPrefs} />
                    <LineupOptimizer roster={myTeam.roster} teamName={myTeam.name} />
                  </motion.div>
                )}
                {activeTab === 'roster' && !myTeam && (
                  <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                     <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                  </div>
                )}`;

const replacement = `{activeTab === 'roster' && selectedTeam && (
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
                )}`;

code = code.replace(searchStr, replacement);
fs.writeFileSync('src/App.tsx', code);
