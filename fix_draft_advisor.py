import re

with open("src/components/DraftAdvisor.tsx", "r") as f:
    text = f.read()

# Add states for drafted players tracking
state_add = """  const [draftedPlayers, setDraftedPlayers] = useState<string[]>([]);
  const [draftPlayerInput, setDraftPlayerInput] = useState('');"""
text = text.replace("  const [loadingPhrase, setLoadingPhrase] = useState('Analizando tendencias del draft...');", "  const [loadingPhrase, setLoadingPhrase] = useState('Analizando tendencias del draft...');\n" + state_add)

# Change handleFetchRecommendation to include draftedPlayers
fetch_logic = """  const handleFetchRecommendation = async (selectedStrat: typeof strategy) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: selectedStrat, draftedPlayers }),
      });"""
text = re.sub(r"  const handleFetchRecommendation = async \(selectedStrat: typeof strategy\) => \{.*?body: JSON.stringify\(\{ strategy: selectedStrat \}\),\n      \}\);", fetch_logic, text, flags=re.DOTALL)

# Add UI for drafted players at the top of the tab
ui_add = """      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 bg-neutral-900/60 p-5 rounded-2xl border border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-200 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Jugadores Drafteados
          </h3>
          <p className="text-xs text-neutral-400 mb-4">
            Añade los jugadores que ya han sido seleccionados para que la IA los descarte de sus recomendaciones.
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={draftPlayerInput}
              onChange={e => setDraftPlayerInput(e.target.value)}
              placeholder="Ej. Nikola Jokic..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draftPlayerInput.trim()) {
                  setDraftedPlayers([...draftedPlayers, draftPlayerInput.trim()]);
                  setDraftPlayerInput('');
                }
              }}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button 
              onClick={() => {
                if (draftPlayerInput.trim()) {
                  setDraftedPlayers([...draftedPlayers, draftPlayerInput.trim()]);
                  setDraftPlayerInput('');
                }
              }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              Añadir
            </button>
          </div>
          {draftedPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
              {draftedPlayers.map((player, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-neutral-800/80 text-neutral-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-neutral-700/50">
                  {player}
                  <button 
                    onClick={() => setDraftedPlayers(draftedPlayers.filter((_, i) => i !== idx))}
                    className="text-neutral-500 hover:text-red-400 ml-1 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
"""

text = text.replace("      <div className=\"min-h-[400px]\">", ui_add + "      <div className=\"min-h-[400px]\">")

# Add the Recommended Picks to the UI
reco_ui = """                  {/* RECOMMENDED PICKS */}
                  {recommendation.recommendedPicks && recommendation.recommendedPicks.length > 0 && (
                    <div className="bg-orange-950/20 border border-orange-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                      <h4 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-orange-500" />
                        Mejores Selecciones Disponibles (Siguiente Pick)
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        {recommendation.recommendedPicks.map((pick, idx) => (
                          <div
                            key={`pick-${idx}`}
                            className="bg-neutral-900 border border-neutral-800/80 p-4 rounded-xl hover:border-orange-500/40 transition duration-200"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div>
                                <h5 className="font-bold text-white text-sm">
                                  {pick.name}
                                </h5>
                                <p className="text-[10px] text-neutral-500 font-mono uppercase">{pick.team}</p>
                              </div>
                              <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 text-[10px] font-extrabold text-orange-400 rounded-lg">
                                {pick.expectedRound}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed font-light">
                              {pick.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SLEEPERS GRID */}"""

text = text.replace("                  {/* SLEEPERS GRID */}", reco_ui)


with open("src/components/DraftAdvisor.tsx", "w") as f:
    f.write(text)

