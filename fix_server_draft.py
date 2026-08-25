import re
with open('server.ts', 'r') as f:
    text = f.read()

replacement = """app.post('/api/analyze/draft', async (req, res) => {
  const { strategy, draftedPlayers } = req.body as { strategy?: string, draftedPlayers?: string[] };
  const chosenStrategy = strategy || 'Equilibrada';
  const draftedList = draftedPlayers && draftedPlayers.length > 0 ? draftedPlayers.join(', ') : 'Ninguno';

  try {
    const ai = getGemini();

    const prompt = `Proporciona recomendaciones estratégicas detalladas de draft de NBA Fantasy para la temporada actual (2026-2027) o la última disponible.
Estrategia elegida: ${chosenStrategy}
Jugadores que ya han sido drafteados (NO RECOMENDAR A ESTOS JUGADORES): ${draftedList}

Por favor, busca información en tiempo real sobre:
- Mejores jugadores disponibles (considerando los ya drafteados) para la siguiente selección.
- Jugadores revelación ("breakouts") para NBA Fantasy esta temporada.
- "Sleepers" (jugadores infravalorados en los rankings) recomendados.
- Novatos (rookies) con mayor potencial de impacto inmediato en fantasy.
- Consejos específicos para la estrategia de draft seleccionada ("${chosenStrategy}").

IMPORTANTE: Responde en español en un formato JSON estructurado que coincida exactamente con este esquema:
{
  "summary": "Un resumen ejecutivo e inspirador sobre la estrategia de draft, la temporada de NBA Fantasy 2026/2027, y tendencias actuales en formato Markdown...",
  "recommendedPicks": [
    { "name": "Nombre Jugador", "team": "Equipo", "reason": "Por qué seleccionarlo ahora", "expectedRound": "Ronda" }
  ],
  "sleepers": [
    { "name": "Nombre de Jugador Sleeper 1", "team": "Equipo NBA (ej. LAL)", "reason": "Razón detallada de por qué es sleeper...", "expectedRound": "Ronda sugerida (ej. 8-10)" }
  ],
  "rookies": [
    { "name": "Nombre Novato 1", "team": "Equipo NBA (ej. SAS)", "reason": "Por qué tiene impacto de fantasy inmediato...", "expectedRound": "Ronda sugerida (ej. 9-11)" }
  ],
  "breakouts": [
    { "name": "Nombre Breakout 1", "team": "Equipo NBA (ej. OKC)", "reason": "Por qué va a explotar estadísticamente esta temporada...", "expectedRound": "Ronda sugerida (ej. 4-6)" }
  ],
  "puntStrategyAdvice": "Consejos específicos y tácticos para ejecutar esta estrategia o refinar tu draft en formato Markdown..."
}`;"""

text = re.sub(r"app\.post\('/api/analyze/draft', async \(req, res\) => \{.*?\n\}`;", replacement, text, flags=re.DOTALL)

# Add recommendedPicks to responseSchema
schema_mod = """          properties: {
            summary: { type: Type.STRING },
            recommendedPicks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  team: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  expectedRound: { type: Type.STRING }
                }
              }
            },
            sleepers: {"""

text = text.replace("""          properties: {
            summary: { type: Type.STRING },
            sleepers: {""", schema_mod)

with open('server.ts', 'w') as f:
    f.write(text)
