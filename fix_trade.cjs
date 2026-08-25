const fs = require('fs');
let code = fs.readFileSync('src/components/TradeAnalyzer.tsx', 'utf8');
code = code.replace(/dataKey=\{selectedTeam1\.name\}/g, "dataKey={selectedTeam1?.name || ''}");
code = code.replace(/dataKey=\{selectedTeam2\.name\}/g, "dataKey={selectedTeam2?.name || ''}");
// Also the insight text might break if selectedTeam1 is null, but we have early return inside useMemo so dynamicInsight is just ''.
// Wait, is there any other place in TradeAnalyzer render?
fs.writeFileSync('src/components/TradeAnalyzer.tsx', code);
