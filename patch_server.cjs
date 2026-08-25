const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `app.post('/api/analyze/trades', async (req, res) => {
  const { teams } = req.body as { teams: FantasyTeam[] };`;
  
const newStr = `app.post('/api/analyze/trades', async (req, res) => {
  const { teams, myTeamId } = req.body as { teams: FantasyTeam[], myTeamId?: string };`;

code = code.replace(targetStr, newStr);

const targetPrompt = `    const prompt = \`Analiza estos equipos de Fantasy Basketball de ESPN. Sugiere hasta 3 intercambios justos, inteligentes y realistas (ganar-ganar) entre los equipos.
Busca situaciones donde un equipo tenga exceso de una estadística o posición, y déficit en otra, mientras que el otro equipo tenga las necesidades inversas.
Por ejemplo, si un equipo tiene exceso de bloqueos (Centers) pero carece de triples y asistencias (Guards), y el otro equipo tiene exceso de bases pero no tiene bloqueadores.`;

const newPrompt = `    let teamFilterInstructions = "";
    if (myTeamId) {
      teamFilterInstructions = \`\\nMUY IMPORTANTE: TODAS las sugerencias de intercambio DEBEN involucrar obligatoriamente al equipo con ID "\${myTeamId}" (ya sea como proposer o receiver). No propongas intercambios entre otros dos equipos.\`;
    }

    const prompt = \`Analiza estos equipos de Fantasy Basketball de ESPN. Sugiere hasta 3 intercambios justos, inteligentes y realistas (ganar-ganar) entre los equipos.\${teamFilterInstructions}
Busca situaciones donde un equipo tenga exceso de una estadística o posición, y déficit en otra, mientras que el otro equipo tenga las necesidades inversas.
Por ejemplo, si un equipo tiene exceso de bloqueos (Centers) pero carece de triples y asistencias (Guards), y el otro equipo tiene exceso de bases pero no tiene bloqueadores.`;

code = code.replace(targetPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
