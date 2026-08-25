const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/setTimeLeft\(15\)/g, 'setTimeLeft(600)');
code = code.replace(/return 15;/g, 'return 600;');
code = code.replace(/cada 15s/g, 'cada 10m');
fs.writeFileSync('src/App.tsx', code);
