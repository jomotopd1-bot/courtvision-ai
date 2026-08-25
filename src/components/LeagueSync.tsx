import React, { useState } from 'react';
import { Database, Link2, Info, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface LeagueSyncProps {
  onSync: (params: { leagueId: string; seasonId: string; swid?: string; espnS2?: string }) => void;
  isLoading: boolean;
  error: string | null;
  syncSuccess: boolean;
  isDemo: boolean;
}

export default function LeagueSync({ onSync, isLoading, error, syncSuccess, isDemo }: LeagueSyncProps) {
  const [leagueId, setLeagueId] = useState('');
  const [seasonId, setSeasonId] = useState('2027');
  const [swid, setSwid] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [showPrivateFields, setShowPrivateFields] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSync({ leagueId, seasonId, swid: swid || undefined, espnS2: espnS2 || undefined });
  };

  const handleLoadDemo = () => {
    onSync({ leagueId: 'demo', seasonId: '2027' });
  };

  return (
    <div id="league-sync-section" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-500" />
            Sincronizar Liga ESPN Fantasy
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Conecta tu liga real de ESPN para importar tus escuadras, estadísticas y proyecciones.
          </p>
        </div>
        <button
          id="btn-load-demo"
          type="button"
          onClick={handleLoadDemo}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-medium rounded-xl transition duration-200 border border-orange-500/20"
        >
          <Play className="w-4 h-4 fill-orange-400 text-orange-400" />
          Probar Liga Demo (Recomendado)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="leagueId" className="block text-xs font-semibold text-neutral-400 uppercase mb-1.5">
              ID de la Liga ESPN
            </label>
            <div className="relative">
              <input
                id="leagueId"
                type="text"
                placeholder="Ej. 12345678"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition"
              />
              <Link2 className="absolute right-3 top-3.5 w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <div>
            <label htmlFor="seasonId" className="block text-xs font-semibold text-neutral-400 uppercase mb-1.5">
              Temporada (Año)
            </label>
            <select
              id="seasonId"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm transition"
            >
              <option value="2027">2026-2027 (Actual)</option>
              <option value="2026">2025-2026 (Pasada)</option>
              <option value="2025">2024-2025</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              id="btn-sync-submit"
              type="submit"
              disabled={isLoading || !leagueId}
              className={`w-full py-2.5 px-4 font-semibold text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm ${
                isLoading || !leagueId
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-800'
                  : 'bg-orange-600 hover:bg-orange-500 active:scale-98 shadow-md shadow-orange-600/10'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sincronizando...
                </span>
              ) : (
                'Sincronizar Liga Real'
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            id="btn-toggle-private"
            type="button"
            onClick={() => setShowPrivateFields(!showPrivateFields)}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-200 underline focus:outline-none"
          >
            {showPrivateFields ? 'Ocultar campos de liga privada' : '¿Tu liga es privada? Clic aquí'}
          </button>
        </div>

        {showPrivateFields && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-neutral-800/30 rounded-xl border border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label htmlFor="swid" className="block text-xs font-semibold text-neutral-400 uppercase mb-1">
                SWID Cookie Value
              </label>
              <input
                id="swid"
                type="text"
                placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                value={swid}
                onChange={(e) => setSwid(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs transition"
              />
            </div>
            <div>
              <label htmlFor="espnS2" className="block text-xs font-semibold text-neutral-400 uppercase mb-1">
                espn_s2 Cookie Value
              </label>
              <input
                id="espnS2"
                type="text"
                placeholder="Larga cadena hexadecimal..."
                value={espnS2}
                onChange={(e) => setEspnS2(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs transition"
              />
            </div>
            <div className="col-span-1 md:col-span-2 flex items-start gap-2 text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>
                Para ligas privadas de ESPN, debes buscar en las cookies de tu navegador mientras estás logueado en espn.com. Inspecciona la página, ve a Aplicación (o Almacenamiento) → Cookies → espn.com, y copia los valores de <strong>SWID</strong> y <strong>espn_s2</strong>.
              </span>
            </div>
          </motion.div>
        )}

        {/* FEEDBACK STATUS */}
        {error && (
          <div id="sync-error-banner" className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Fallo de sincronización</p>
              <p className="mt-0.5 text-red-400/90">{error}</p>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="text-orange-400 underline font-semibold mt-1 hover:text-orange-300"
              >
                Cargar la Liga Demo para probar la funcionalidad
              </button>
            </div>
          </div>
        )}

        {syncSuccess && (
          <div id="sync-success-banner" className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>¡Conectado con éxito!</strong> Se ha importado la liga{' '}
              <span className="font-semibold text-emerald-300">
                {isDemo ? 'La Liga de Oro (Demo)' : 'Tu Liga de ESPN'}
              </span>{' '}
              correctamente.
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
