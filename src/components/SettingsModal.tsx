import React from 'react';
import { X, Globe, Trash2, Database, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedLeague } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'es' | 'en';
  setLanguage: (lang: 'es' | 'en') => void;
  savedLeagues: SavedLeague[];
  onDeleteLeague: (leagueId: string, seasonId: string) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  onTestConnection?: () => Promise<void>;
  onResetApiUrl?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  language,
  setLanguage,
  savedLeagues,
  onDeleteLeague,
  apiUrl,
  setApiUrl,
  onTestConnection,
  onResetApiUrl
}: SettingsModalProps) {
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!onTestConnection) return;
    setTestStatus('testing');
    try {
      await onTestConnection();
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (e) {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 5000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-500 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {language === 'es' ? 'Configuración' : 'Settings'}
          </h2>

          <div className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-orange-500" />
                {language === 'es' ? 'Idioma de la Aplicación' : 'App Language'}
              </label>
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setLanguage('es')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                    language === 'es'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  Español
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
                    language === 'en'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* API URL Configuration */}
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <label className="text-sm font-bold text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
                <Database className="w-4 h-4 text-orange-500" />
                {language === 'es' ? 'Servidor de Sincronización' : 'Sync Server'}
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://192.168.1.XX:3000"
                  className="w-full bg-neutral-950 text-xs text-neutral-200 border border-neutral-800 rounded-xl px-4 py-2.5 focus:border-orange-500 focus:outline-none transition"
                />
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  {language === 'es'
                    ? 'Si usas la app en un móvil, ingresa la URL de Render (ej: https://app.onrender.com) para conectar con el motor de IA.'
                    : 'If using on mobile, enter your Render URL (e.g. https://app.onrender.com) to connect with the AI engine.'}
                </p>
                <button
                  onClick={handleTest}
                  disabled={testStatus === 'testing' || !apiUrl}
                  className={`w-full mt-2 py-2 text-[10px] font-bold rounded-lg border transition ${
                    testStatus === 'testing' ? 'bg-neutral-800 text-neutral-500 border-neutral-700' :
                    testStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    testStatus === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                  }`}
                >
                  {testStatus === 'testing' ? 'Probando...' :
                   testStatus === 'success' ? '¡Conexión Exitosa!' :
                   testStatus === 'error' ? 'Fallo de Conexión' :
                   'Probar Conexión con Servidor'}
                </button>
                {onResetApiUrl && (
                  <button
                    onClick={onResetApiUrl}
                    className="w-full mt-2 py-2 text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {language === 'es' ? 'Restablecer URL por defecto' : 'Reset to Default URL'}
                  </button>
                )}
              </div>
            </div>

            {/* Saved Leagues Management */}
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <label className="text-sm font-bold text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
                <Database className="w-4 h-4 text-orange-500" />
                {language === 'es' ? 'Ligas Guardadas' : 'Saved Leagues'}
              </label>
              
              {savedLeagues.length === 0 ? (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-neutral-500 font-medium">
                    {language === 'es' ? 'No hay ligas guardadas' : 'No saved leagues'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {savedLeagues.map((l, idx) => (
                    <div key={`${l.leagueId}-${l.seasonId}-${idx}`} className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-xl group hover:border-neutral-700 transition">
                      <div>
                        <p className="text-sm font-bold text-neutral-200">{l.name || (language === 'es' ? 'Liga' : 'League') + ' ' + l.leagueId}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">
                          ID: {l.leagueId} • {language === 'es' ? 'Temp' : 'Season'}: {l.seasonId}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteLeague(l.leagueId, l.seasonId)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                        title={language === 'es' ? 'Eliminar liga' : 'Delete league'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {savedLeagues.length > 0 && (
                <p className="text-[10px] text-neutral-500 flex items-start gap-1.5 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {language === 'es' 
                    ? 'Al eliminar una liga, se borrará de tus opciones guardadas locales, pero no afectará a ESPN.' 
                    : 'Deleting a league removes it from your local saved options, but does not affect ESPN.'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
