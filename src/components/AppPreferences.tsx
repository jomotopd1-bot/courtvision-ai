import { useState, useEffect } from 'react';
import { Sliders, Check, RotateCcw, HelpCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AppPreferencesProps {
  categoryPrefs: Record<string, boolean>;
  onChange: (prefs: Record<string, boolean>) => void;
}

const CATEGORY_METADATA = [
  { id: 'pts', label: 'Puntos (PTS)', desc: 'Puntuación total anotada por el jugador.', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
  { id: 'reb', label: 'Rebotes (REB)', desc: 'Suma de rebotes defensivos y ofensivos.', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
  { id: 'ast', label: 'Asistencias (AST)', desc: 'Pases que conducen directamente a una canasta.', color: 'border-sky-500/30 text-sky-400 bg-sky-500/5' },
  { id: 'stl', label: 'Robos (STL)', desc: 'Balones robados a los oponentes.', color: 'border-pink-500/30 text-pink-400 bg-pink-500/5' },
  { id: 'blk', label: 'Bloqueos (BLK)', desc: 'Tiros del rival taponados.', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5' },
  { id: 'tpm', label: 'Triples (3PM)', desc: 'Tiros de tres puntos anotados.', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' },
  { id: 'tov', label: 'Pérdidas (TOV)', desc: 'Balones perdidos por el jugador (menor es mejor).', color: 'border-red-500/30 text-red-400 bg-red-500/5' },
  { id: 'fgPct', label: 'TC% (FG%)', desc: 'Porcentaje de acierto en tiros de campo.', color: 'border-teal-500/30 text-teal-400 bg-teal-500/5' },
  { id: 'ftPct', label: 'TL% (FT%)', desc: 'Porcentaje de acierto en tiros libres.', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' }
];

const DEFAULT_PREFS = {
  pts: true,
  reb: true,
  ast: true,
  stl: true,
  blk: true,
  tpm: true,
  tov: true,
  fgPct: true,
  ftPct: true
};

export default function AppPreferences({ categoryPrefs, onChange }: AppPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCategory = (id: string) => {
    const updated = {
      ...categoryPrefs,
      [id]: !categoryPrefs[id]
    };
    
    // Prevent disabling all categories
    const activeCount = Object.values(updated).filter(Boolean).length;
    if (activeCount === 0) return;

    onChange(updated);
  };

  const resetToDefault = () => {
    onChange(DEFAULT_PREFS);
  };

  const activeCount = Object.values(categoryPrefs).filter(Boolean).length;

  return (
    <div id="app-preferences-panel" className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4 shadow-sm space-y-4">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-600/10 rounded-xl border border-orange-500/10 mt-0.5">
            <Sliders className="w-4 h-4 text-orange-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-neutral-100">Preferencias de Visualización de Categorías</h4>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-orange-600/10 text-orange-400 border border-orange-500/20">
                {activeCount} de {CATEGORY_METADATA.length} Activas
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
              Personaliza qué métricas se visualizan y analizan por defecto en todos los gráficos, comparativas de rivales y tablas de plantilla.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            id="btn-toggle-preferences"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            {isOpen ? 'Ocultar Filtros' : 'Configurar Categorías'}
          </button>
        </div>
      </div>

      {/* EXPANDABLE CATEGORY LIST */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-4 border-t border-neutral-800/60 space-y-4 overflow-hidden"
        >
          {/* CATEGORIES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORY_METADATA.map((cat) => {
              const isEnabled = categoryPrefs[cat.id];
              return (
                <button
                  key={cat.id}
                  id={`pref-switch-${cat.id}`}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    backgroundColor: isEnabled ? 'rgba(249, 115, 22, 0.05)' : 'transparent',
                    borderColor: isEnabled ? 'rgba(249, 115, 22, 0.3)' : '#262626'
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition duration-200 hover:bg-neutral-900/40 relative group cursor-pointer`}
                >
                  {/* Custom checkbox */}
                  <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isEnabled 
                      ? 'bg-orange-600 border-orange-600 text-white' 
                      : 'border-neutral-700 bg-neutral-950 group-hover:border-neutral-600'
                  }`}>
                    {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-200">{cat.label}</span>
                      <span className={`px-1 py-0.2 rounded text-[8px] font-mono border ${cat.color}`}>
                        {cat.id.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIONS AND FOOTER INFO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800/40 text-[11px]">
            <div className="text-neutral-500 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Las preferencias se sincronizan automáticamente con tu almacenamiento local para futuras visitas.</span>
            </div>
            
            <button
              id="btn-reset-preferences"
              onClick={resetToDefault}
              className="px-3 py-1.5 text-neutral-400 hover:text-neutral-200 transition font-bold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto bg-neutral-950 rounded-lg border border-neutral-850"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Valores
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
