import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert, Sparkles, Plus, Check, Play, Activity } from 'lucide-react';
import { NewsAlert, FantasyTeam } from '../types.js';
import { motion, AnimatePresence } from 'motion/react';
import InjuryTracker from './InjuryTracker.js';

interface NewsFeedProps {
  alerts: NewsAlert[];
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onSimulate: (alertData: any) => void;
  teams?: FantasyTeam[];
  getFullUrl?: (path: string) => string;
}

export default function NewsFeed({ alerts, onRefresh, onMarkRead, onSimulate, teams, getFullUrl = (p) => p }: NewsFeedProps) {
  const [showSimulateForm, setShowSimulateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [affectedPlayer, setAffectedPlayer] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'warning' | 'info'>('warning');
  const [type, setType] = useState<'injury' | 'breaking' | 'lineup'>('injury');
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'tracker'>('alerts');

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    onSimulate({ title, content, affectedPlayer: affectedPlayer || undefined, severity, type });
    // Reset form
    setTitle('');
    setContent('');
    setAffectedPlayer('');
    setShowSimulateForm(false);
  };

  const getAlertIcon = (sev: NewsAlert['severity'], type: NewsAlert['type']) => {
    if (type === 'injury') {
      return sev === 'critical' ? (
        <span className="p-2 bg-red-500/10 text-red-400 rounded-xl shrink-0 border border-red-500/15">
          <AlertTriangle className="w-5 h-5" />
        </span>
      ) : (
        <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 border border-amber-500/15">
          <AlertTriangle className="w-5 h-5" />
        </span>
      );
    }
    return (
      <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 border border-blue-500/15">
        <Info className="w-5 h-5" />
      </span>
    );
  };

  const getSeverityStyle = (alert: NewsAlert) => {
    if (alert.read) return 'border-neutral-850 bg-neutral-900/40 opacity-60';
    if (alert.severity === 'critical') return 'border-red-900/30 bg-red-950/10';
    if (alert.severity === 'warning') return 'border-amber-900/30 bg-amber-950/10';
    return 'border-blue-900/30 bg-blue-950/10';
  };

  return (
    <div id="news-feed-card" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-neutral-400" />
              {alerts.some((a) => !a.read) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a] animate-bounce"></span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Reporte de Lesiones & Noticias</h3>
              <p className="text-[11px] text-neutral-400 font-medium">Actualizaciones de última hora sincronizadas con la NBA.</p>
            </div>
          </div>

          {activeSubTab === 'alerts' && (
            <button
              id="btn-open-simulate-panel"
              onClick={() => setShowSimulateForm(!showSimulateForm)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold rounded-lg text-[10px] uppercase tracking-wider transition border border-orange-500/10 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Simular Noticia
            </button>
          )}
        </div>

        {/* SUB TABS FOR NEWS FEED & LEAGUE INJURY TRACKER */}
        {teams && teams.length > 0 && (
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-855 mb-5 font-mono max-w-md">
            <button
              id="subtab-alerts"
              onClick={() => {
                setActiveSubTab('alerts');
                setShowSimulateForm(false);
              }}
              className={`flex-1 py-1.5 px-3 text-center rounded-lg text-[11px] font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'alerts'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Alertas de Noticias
            </button>
            <button
              id="subtab-tracker"
              onClick={() => {
                setActiveSubTab('tracker');
                setShowSimulateForm(false);
              }}
              className={`flex-1 py-1.5 px-3 text-center rounded-lg text-[11px] font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'tracker'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Monitor de Lesiones Liga
            </button>
          </div>
        )}

        {activeSubTab === 'alerts' ? (
          <>
            {/* SIMULATE ALERT PANEL */}
            <AnimatePresence>
              {showSimulateForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSimulateSubmit}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl mb-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Consola de Simulación en Tiempo Real
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label htmlFor="sim-title" className="block font-semibold text-neutral-400 mb-0.5">Título del Evento</label>
                      <input
                        id="sim-title"
                        type="text"
                        required
                        placeholder="Ej. Stephen Curry descartado de último minuto por gripe"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-neutral-850 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="sim-content" className="block font-semibold text-neutral-400 mb-0.5">Detalles del Reporte</label>
                      <textarea
                        id="sim-content"
                        required
                        placeholder="Explica qué pasó, si afecta su juego de hoy o si Skyline Dunkers debe sentarlo..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-neutral-850 rounded-lg text-neutral-100 placeholder-neutral-600 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="sim-player" className="block font-semibold text-neutral-400 mb-0.5">Jugador Afectado</label>
                        <input
                          id="sim-player"
                          type="text"
                          placeholder="Ej. Stephen Curry"
                          value={affectedPlayer}
                          onChange={(e) => setAffectedPlayer(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-neutral-850 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="sim-type" className="block font-semibold text-neutral-400 mb-0.5">Tipo</label>
                        <select
                          id="sim-type"
                          value={type}
                          onChange={(e) => setType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-neutral-850 rounded-lg text-neutral-350 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                        >
                          <option value="injury">Lesión (Injury)</option>
                          <option value="breaking">Última Hora (Breaking)</option>
                          <option value="lineup">Rotación (Lineup)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="sim-severity" className="block font-semibold text-neutral-400 mb-0.5">Gravedad</label>
                        <select
                          id="sim-severity"
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-neutral-850 rounded-lg text-neutral-350 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                        >
                          <option value="critical">Crítica (OUT)</option>
                          <option value="warning">Advertencia (GTD)</option>
                          <option value="info">Informativa</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          id="btn-simulate-submit"
                          type="submit"
                          className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                        >
                          Inyectar Notificación
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* LIST OF ALERTS */}
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">No hay alertas ni noticias reportadas recientemente.</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex gap-3 transition-all ${getSeverityStyle(alert)}`}
                  >
                    {getAlertIcon(alert.severity, alert.type)}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-xs font-bold leading-tight ${alert.read ? 'text-neutral-500' : 'text-neutral-100'}`}>
                          {alert.title}
                        </h4>
                        {!alert.read && (
                          <button
                            onClick={() => onMarkRead(alert.id)}
                            className="p-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-md transition shrink-0 border border-neutral-700/50 cursor-pointer"
                            title="Marcar como leído"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        {alert.content}
                      </p>
                      <p className="text-[9px] font-mono text-neutral-500 mt-2">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <InjuryTracker teams={teams || []} alerts={alerts} />
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>Actualización automática activada</span>
        <button
          onClick={onRefresh}
          className="text-orange-400 font-semibold hover:text-orange-300"
        >
          Sincronizar ahora
        </button>
      </div>
    </div>
  );
}
