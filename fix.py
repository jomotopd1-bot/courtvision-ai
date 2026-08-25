import re
with open("src/App.tsx", "r") as f:
    text = f.read()

# Replace the messy ending
idx = text.rfind("</main>")
if idx != -1:
    text = text[:idx] + """</main>
      <footer className="border-t border-neutral-900 py-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500">
          <p>© 2026 ESPN Fantasy Basketball Sync & Analyzer • Potenciado por Inteligencia Artificial de Google Gemini</p>
        </div>
      </footer>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        setLanguage={setLanguage}
        savedLeagues={savedLeagues}
        onDeleteLeague={handleDeleteLeague}
      />
    </div>
  );
}
"""
    with open("src/App.tsx", "w") as f:
        f.write(text)
