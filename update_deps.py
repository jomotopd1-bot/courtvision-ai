import re
with open("src/components/DraftAdvisor.tsx", "r") as f:
    text = f.read()

# Add a button to refresh recommendations when draftedPlayers changes
refresh_button_ui = """      {draftedPlayers.length > 0 && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => handleFetchRecommendation(strategy)}
            disabled={isLoading}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Actualizar Recomendaciones
          </button>
        </div>
      )}
      <div className="min-h-[400px]">"""

text = text.replace("      <div className=\"min-h-[400px]\">", refresh_button_ui)

with open("src/components/DraftAdvisor.tsx", "w") as f:
    f.write(text)

