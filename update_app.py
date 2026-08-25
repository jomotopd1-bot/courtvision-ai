import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Replace MyTeamEditor invocation
old_invocation = """                    <MyTeamEditor 
                      team={selectedTeam} 
                      language={language}
                      onUpdateTeam={(updatedTeam) => {
                        if (league) {
                          const newTeams = league.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t);
                          setLeague({ ...league, teams: newTeams });
                        }
                      }}
                    />"""

new_invocation = """                    <MyTeamEditor 
                      league={league}
                      myTeamId={myTeamIds[league.id]}
                      onSetMyTeam={(teamId) => {
                        setMyTeamIds(prev => ({ ...prev, [league.id]: teamId }));
                      }}
                      language={language}
                      onUpdateTeam={(updatedTeam) => {
                        if (league) {
                          const newTeams = league.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t);
                          setLeague({ ...league, teams: newTeams });
                        }
                      }}
                    />"""

text = text.replace(old_invocation, new_invocation)

# Also fix the `activeTab === 'myteam' && selectedTeam && (` line since myteam doesn't require selectedTeam to be active from standings
text = text.replace("{activeTab === 'myteam' && selectedTeam && (", "{activeTab === 'myteam' && league && (")

with open("src/App.tsx", "w") as f:
    f.write(text)

