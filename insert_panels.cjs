const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newPanels = `
                {activeTab === 'compare' && (
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
                )}
                {activeTab === 'trades' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <TradeAnalyzer teams={league.teams} categoryPrefs={categoryPrefs} myTeamId={myTeamId} language={language} />
                  </motion.div>
                )}
                {activeTab === 'news' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <NewsFeed
                      alerts={news}
                      onRefresh={fetchNews}
                      onMarkRead={handleMarkNewsRead}
                      onSimulate={handleSimulateNews}
                      teams={league?.teams || []}
                    />
                  </motion.div>
                )}
                {activeTab === 'draft' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <DraftAdvisor />
                  </motion.div>
                )}
                {activeTab === 'opponent' && (
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
                )}
`;

const searchStr = `{activeTab === 'waiver' && (`;
code = code.replace(searchStr, newPanels + searchStr);
fs.writeFileSync('src/App.tsx', code);
