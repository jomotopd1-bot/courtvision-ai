const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newTabs = `                <button
                  id="tab-compare"
                  onClick={() => setActiveTab('compare')}
                  className={\`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 \${
                    activeTab === 'compare'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }\`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {language === 'es' ? 'Comparar' : 'Compare'}
                </button>
                <button
                  id="tab-opponent"
                  onClick={() => setActiveTab('opponent')}
                  className={\`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 \${
                    activeTab === 'opponent'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }\`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {language === 'es' ? 'Pronóstico Rival IA' : 'AI Opponent Forecast'}
                </button>
                <button
                  id="tab-trades"
                  onClick={() => setActiveTab('trades')}
                  className={\`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 \${
                    activeTab === 'trades'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }\`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Sugeridor de Traspasos
                </button>
                <button
                  id="tab-news"
                  onClick={() => setActiveTab('news')}
                  className={\`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 relative \${
                    activeTab === 'news'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }\`}
                >
                  <Bell className="w-4 h-4" />
                  Noticias & Lesiones
                  {news.some(n => !n.read) && (
                    <span className="w-2 h-2 bg-red-500 rounded-full border border-white absolute top-1.5 right-2"></span>
                  )}
                </button>
                <button
                  id="tab-draft"
                  onClick={() => setActiveTab('draft')}
                  className={\`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 \${
                    activeTab === 'draft'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }\`}
                >
                  <Compass className="w-4 h-4" />
                  Asesor de Draft IA
                </button>
`;

// Insert after tab-myteam button
const searchStr = `{language === 'es' ? 'Mi Equipo' : 'My Team'}\n                </button>`;
code = code.replace(searchStr, searchStr + '\n' + newTabs);
fs.writeFileSync('src/App.tsx', code);
