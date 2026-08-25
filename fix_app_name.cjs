const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/if \(p\.name\.toLowerCase/g, 'if (p.name && p.name.toLowerCase');
fs.writeFileSync('src/App.tsx', code);
