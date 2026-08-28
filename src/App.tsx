import React, { useState, useEffect, useRef } from 'react';
import { League, FantasyTeam, NewsAlert, SavedLeague } from './types.js';
import LeagueSync from './components/LeagueSync.js';
import Standings from './components/Standings.js';
import RosterList from './components/RosterList.js';
import LineupOptimizer from './components/LineupOptimizer.js';
import TradeAnalyzer from './components/TradeAnalyzer.js';
import NewsFeed from './components/NewsFeed.js';
import DraftAdvisor from './components/DraftAdvisor.js';
import TeamWeeklyChart from './components/TeamWeeklyChart.js';
import WaiverWire from './components/WaiverWire.js';
import OpponentForecast from './components/OpponentForecast.js';
import AppPreferences from './components/AppPreferences.js';
import PlayerComparison from './components/PlayerComparison.js';
import SettingsModal from './components/SettingsModal.js';
import MyTeamEditor from './components/MyTeamEditor.js';
import { Activity, LayoutDashboard, RefreshCw, Bell, Brain, AlertTriangle, Sparkles, Zap, ChevronRight, CheckCircle2, Compass, Clock, UserPlus, ShieldAlert, ArrowRightLeft, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle, logout, db } from './lib/firebase.js';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MOCK_LEAGUE, MOCK_NEWS } from './demoLeagueData.js';


import LoginScreen from './components/LoginScreen.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('courtvision_is_guest') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('courtvision_is_guest', isGuest.toString());
  }, [isGuest]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('courtvision_api_url') || '';
  });
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    return (localStorage.getItem('courtvision_language') as 'es' | 'en') || 'es';
  });

  useEffect(() => {
    localStorage.setItem('courtvision_api_url', apiUrl);
  }, [apiUrl]);

  const getFullUrl = (path: string) => {
    if (!apiUrl) return path;
    const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    return `${base}${path}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load data from Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.savedLeagues) setSavedLeagues(data.savedLeagues);
            if (data.myTeamIds) setMyTeamIds(data.myTeamIds);
            if (data.categoryPrefs) setCategoryPrefs(data.categoryPrefs);
            if (data.language) setLanguage(data.language);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveToFirestore = async (data: any) => {
    if (!user) return;
    try {
      // Remove undefined values deeply to prevent Firestore error
      const cleanedData = JSON.parse(JSON.stringify(data));
      if (Object.keys(cleanedData).length === 0) return;
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, cleanedData, { merge: true });
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem('courtvision_language', language);
    if (user) saveToFirestore({ language });
  }, [language, user]);

  const [league, setLeague] = useState<League | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [myTeamIds, setMyTeamIds] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('courtvision_my_team_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });
  
  useEffect(() => {
    localStorage.setItem('courtvision_my_team_ids', JSON.stringify(myTeamIds));
    if (user) saveToFirestore({ myTeamIds });
  }, [myTeamIds, user]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(true);

  const [savedLeagues, setSavedLeagues] = useState<SavedLeague[]>(() => {
    const saved = localStorage.getItem('courtvision_saved_leagues');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
      }
    }
    return [];
  });
  
  useEffect(() => {
    localStorage.setItem('courtvision_saved_leagues', JSON.stringify(savedLeagues));
    if (user) saveToFirestore({ savedLeagues });
  }, [savedLeagues, user]);

  const [activeTab, setActiveTab] = useState<'roster' | 'myteam' | 'compare' | 'trades' | 'news' | 'draft' | 'waiver' | 'opponent'>('roster');

  const [news, setNews] = useState<NewsAlert[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Category preferences for graphs and tables
  const [categoryPrefs, setCategoryPrefs] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('courtvision_category_prefs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
      }
    }
    return {
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
  });

  const handleCategoryPrefsChange = (newPrefs: Record<string, boolean>) => {
    setCategoryPrefs(newPrefs);
    localStorage.setItem('courtvision_category_prefs', JSON.stringify(newPrefs));
    if (user) saveToFirestore({ categoryPrefs: newPrefs });
  };


  // States and effects for Auto-Sync (every 30 minutes)
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncParams, setLastSyncParams] = useState<{ leagueId: string; seasonId: string; swid?: string; espnS2?: string }>({
    leagueId: 'demo',
    seasonId: '2027'
  });
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes for auto sync

  // Load initial data on mount
  useEffect(() => {
    fetchNews();

    // Auto-load last saved league if exists and no league is active
    if (!league && savedLeagues.length > 0) {
      const lastLeagueId = localStorage.getItem('courtvision_last_league_id');
      const leagueToLoad = savedLeagues.find(l => l.leagueId === lastLeagueId) || savedLeagues[0];
      if (leagueToLoad) {
        handleSync(leagueToLoad);
      }
    }
  }, [user]);

  // Track last active league
  useEffect(() => {
    if (league && league.id !== 'demo') {
      localStorage.setItem('courtvision_last_league_id', league.id);
    }
  }, [league]);

  const fetchNews = async () => {
    try {
      const res = await fetch(getFullUrl('/api/news'));
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      } else {
        // Fallback for standalone demo
        setNews(MOCK_NEWS);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      // Fallback for standalone demo
      setNews(MOCK_NEWS);
    }
  };

  // Handle delete league
  const handleDeleteLeague = (leagueId: string, seasonId: string) => {
    setSavedLeagues(prev => {
      const updated = prev.filter(l => !(l.leagueId === leagueId && l.seasonId === seasonId));
      localStorage.setItem('courtvision_saved_leagues', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSync = async (params: { leagueId: string; seasonId: string; swid?: string; espnS2?: string }, isBackground = false) => {
    setLastSyncParams(params);
    setTimeLeft(600);
    if (!isBackground) {
      setIsLoading(true);
      setError(null);
      setSyncSuccess(false);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for Render cold start

    try {
      const response = await fetch(getFullUrl('/api/espn/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setLeague(data.league);
        setIsDemo(data.isDemo);
        setSyncSuccess(true);

        if (!data.isDemo) {
          const newSavedLeague: SavedLeague = {
            leagueId: params.leagueId,
            seasonId: params.seasonId,
            swid: params.swid,
            espnS2: params.espnS2,
            name: data.league.name || `Liga ${params.leagueId}`
          };
          setSavedLeagues(prev => {
            const exists = prev.findIndex(l => l.leagueId === params.leagueId && l.seasonId === params.seasonId);
            let updated = [...prev];
            if (exists >= 0) {
              updated[exists] = { ...updated[exists], ...newSavedLeague };
            } else {
              updated.push(newSavedLeague);
            }
            return updated;
          });
        }

        // Default to the user's team or the first team
        const userTeam = data.league.teams.find((t: any) => t.id === 'team_user' || t.owner.includes('Tú'));
        if (userTeam) {
          setSelectedTeamId(userTeam.id);
        } else if (data.league.teams.length > 0) {
          setSelectedTeamId(data.league.teams[0].id);
        }
        await fetchNews();
      } else if (params.leagueId === 'demo') {
        setLeague(MOCK_LEAGUE);
        setIsDemo(true);
        setSyncSuccess(true);
        setSelectedTeamId('team_user');
      } else {
        setError(data.error || 'No se pudo sincronizar la liga.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('El servidor está tardando demasiado en responder. Si es Render, espera 1 min a que despierte y presiona sincronizar de nuevo.');
      } else if (params.leagueId === 'demo') {
        setLeague(MOCK_LEAGUE);
        setIsDemo(true);
        setSyncSuccess(true);
        setSelectedTeamId('team_user');
      } else {
        setError(`Error de red: ${err.message || 'Verifica la conexión'}`);
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const handleSyncRef = useRef(handleSync);
  useEffect(() => {
    handleSyncRef.current = handleSync;
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isAutoSyncEnabled) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSyncRef.current(lastSyncParams, true);
            return 600;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(600);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoSyncEnabled, lastSyncParams]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMarkNewsRead = async (id: string) => {
    try {
      const res = await fetch(getFullUrl('/api/news/read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNews(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async () => {
    const res = await fetch(getFullUrl('/api/health'));
    if (!res.ok) throw new Error();
  };

  const handleSimulateNews = async (alertData: any) => {
    try {
      const res = await fetch(getFullUrl('/api/news/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      if (res.ok) {
        const data = await res.json();
        setNews(prev => [data.alert, ...prev]);
        
        // Trigger temporary toast notification in UI
        setNotification(`🚨 ${data.alert.title}`);
        setTimeout(() => setNotification(null), 6000);

        // If the player is in our selected roster, let's update their local injury status dynamically!
        if (league && alertData.affectedPlayer) {
          const updatedTeams = league.teams.map(team => {
            const updatedRoster = team.roster.map(p => {
              if (p.name && p.name.toLowerCase().includes(alertData.affectedPlayer.toLowerCase())) {
                const statusMap: Record<string, any> = {
                  critical: 'OUT',
                  warning: 'QUESTIONABLE',
                  info: 'ACTIVE'
                };
                return {
                  ...p,
                  injuryStatus: statusMap[alertData.severity] || 'OUT',
                  injuryDetails: alertData.content
                };
              }
              return p;
            });
            return { ...team, roster: updatedRoster };
          });
          setLeague({ ...league, teams: updatedTeams });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const myTeamId = league ? myTeamIds[league.id] : undefined;
  const myTeam = league?.teams.find(t => t.id === myTeamId) || null;

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const prevMyTeamRef = useRef<any>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert(language === 'es' ? 'Tu navegador no soporta notificaciones.' : 'Your browser does not support notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      new Notification('Courtvision.AI', {
        body: language === 'es' ? 'Notificaciones activadas. Te avisaremos de lesiones en tu equipo.' : 'Notifications enabled. We will alert you of injuries in your team.',
      });
    }
  };

  useEffect(() => {
    if (notificationsEnabled && myTeam) {
      const prevTeam = prevMyTeamRef.current;
      if (prevTeam) {
        myTeam.roster.forEach(player => {
          const prevPlayer = prevTeam.roster.find((p: any) => p.id === player.id);
          if (prevPlayer) {
            if ((player.injuryStatus === 'OUT' || player.injuryStatus === 'QUESTIONABLE') && 
                prevPlayer.injuryStatus !== player.injuryStatus) {
               new Notification(language === 'es' ? `🚨 Alerta de Lesión: ${player.name}` : `🚨 Injury Alert: ${player.name}`, {
                 body: language === 'es' 
                  ? `${player.name} (${player.nbaTeam}) ha sido marcado como ${player.injuryStatus}. Revisa tu alineación.` 
                  : `${player.name} (${player.nbaTeam}) has been marked as ${player.injuryStatus}. Check your lineup.`,
               });
            }
          }
        });
      }
      prevMyTeamRef.current = myTeam;
    }
  }, [myTeam, notificationsEnabled, language]);

  const selectedTeam = league?.teams.find(t => t.id === selectedTeamId) || null;

  const currentMatchup = league?.matchups.find(m => 
    myTeamId && (m.homeTeamId === myTeamId || m.awayTeamId === myTeamId) && 
    m.matchupPeriod === league.currentPeriod
  );

  const opponentTeamId = currentMatchup 
    ? (currentMatchup.homeTeamId === myTeamId ? currentMatchup.awayTeamId : currentMatchup.homeTeamId) 
    : null;
  const opponentTeam = league?.teams.find(t => t.id === opponentTeamId) || null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginScreen onGuestLogin={() => setIsGuest(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
      {/* HEADER BANNER */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 shadow-2xl shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="#f97316" strokeWidth="1.5" strokeDasharray="2 2" />
                    <path d="M12 6L12 18M6 12L18 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
                    <circle cx="12" cy="12" r="4" fill="#f97316" className="animate-pulse" />
                    <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2 italic">
                  COURTVISION<span className="text-orange-500 not-italic">.AI</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
                    Neural Optimizer v2.0
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleEnableNotifications}
                className={`group relative p-2.5 rounded-xl border transition-all duration-300 ${notificationsEnabled ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white'}`}
              >
                <Bell className={`w-4 h-4 ${notificationsEnabled ? 'fill-orange-400' : ''}`} />
              </button>

              {league && (
                <div className="h-10 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>
              )}

              {league && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Active League</span>
                  <div className="flex items-center gap-1 group/select relative">
                    <select
                      className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer appearance-none text-right pr-5 relative z-10 hover:text-orange-400 transition-colors"
                      value={league.id}
                      onChange={(e) => {
                        if (e.target.value === 'add_new') {
                          setLeague(null);
                          setSyncSuccess(false);
                        } else {
                          const selectedSaved = savedLeagues.find(l => l.leagueId === e.target.value);
                          if (selectedSaved) {
                            handleSync(selectedSaved);
                          }
                        }
                      }}
                    >
                      {savedLeagues.map((l, idx) => (
                        <option key={`${l.leagueId}-${idx}`} value={l.leagueId} className="bg-neutral-900">
                          {l.name} ({l.seasonId})
                        </option>
                      ))}
                      <option value={league.id} className="bg-neutral-900">{league.name}</option>
                      <option value="add_new" className="bg-neutral-900 text-orange-400 font-bold">+ Agregar nueva liga...</option>
                    </select>
                    <ChevronRight className="w-3 h-3 text-orange-500 rotate-90 absolute right-0 pointer-events-none group-hover/select:translate-y-0.5 transition-transform" />
                  </div>
                </div>
              )}

              <div className="h-10 w-px bg-white/10 hidden md:block"></div>
              
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition shadow-inner text-neutral-300"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={logout}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition text-neutral-400 hover:text-red-400"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* TOAST ALERTS */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className="bg-neutral-950 border border-red-500/30 p-4 rounded-xl shadow-2xl flex items-start gap-3 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">¡Alerta de Lesión de Último Minuto!</p>
                <p className="text-xs text-neutral-200 mt-1 font-medium leading-relaxed">{notification}</p>
                <p className="text-[10px] text-neutral-400 mt-1.5">Revisa la pestaña "Plantilla & Optimización IA" para ajustar tu alineación semanal.</p>
                
    </div>
              
    </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ESPN CONNECTION CONTROL */}
        {!league && (
          <LeagueSync
            onSync={handleSync}
            isLoading={isLoading}
            error={error}
            syncSuccess={syncSuccess}
            isDemo={isDemo}
          />
        )}

        {league && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* COLUMN 1: STANDINGS */}
            <div className="lg:col-span-1 space-y-6">
              <Standings
                teams={league.teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
              />
            </div>
            {/* COLUMN 2 & 3: MAIN WORKSPACE */}
            <div className="lg:col-span-2 space-y-6">
                          <div id="workspace-tabs" className="grid grid-cols-2 md:flex md:flex-wrap border border-neutral-800 bg-neutral-900/40 p-1.5 rounded-xl gap-1">
                <button
                  id="tab-roster"
                  onClick={() => setActiveTab('roster')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'roster'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {language === 'es' ? 'Plantilla & Optimización IA' : 'Roster & AI Optimization'}
                </button>
                <button
                  id="tab-myteam"
                  onClick={() => setActiveTab('myteam')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'myteam'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {language === 'es' ? 'Mi Equipo' : 'My Team'}
                </button>
                <button
                  id="tab-compare"
                  onClick={() => setActiveTab('compare')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'compare'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {language === 'es' ? 'Comparar' : 'Compare'}
                </button>
                <button
                  id="tab-opponent"
                  onClick={() => setActiveTab('opponent')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'opponent'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {language === 'es' ? 'Pronóstico Rival IA' : 'AI Opponent Forecast'}
                </button>
                <button
                  id="tab-trades"
                  onClick={() => setActiveTab('trades')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'trades'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Sugeridor de Traspasos
                </button>
                <button
                  id="tab-news"
                  onClick={() => setActiveTab('news')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'news'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
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
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'draft'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  Asesor de Draft IA
                </button>

                <button
                  id="tab-waiver"
                  onClick={() => setActiveTab('waiver')}
                  className={`py-2.5 px-3 text-center rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'waiver'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Agentes Libres IA
                </button>
                    </div>               

              {/* ACTIVE TAB PANEL */}
              <div id="tab-panel-content" className="space-y-6">
                {/* AUTO-SYNC TOGGLE SWITCH BANNER */}
                <div id="auto-sync-banner" className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-600/10 rounded-xl border border-orange-500/10 mt-0.5">
                      <Clock className="w-4 h-4 text-orange-500" />
                      
    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-100">Auto-Sincronización de Jugadores</h4>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          isAutoSyncEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAutoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`}></span>
                          {isAutoSyncEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                        
    </div>
                      <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
                        {isAutoSyncEnabled ? (
                          <>Sincronización en segundo plano activada. Siguiente actualización automática en <strong className="text-orange-400 font-mono text-[13px]">{formatTime(timeLeft)}</strong>.</>
                        ) : (
                          'Sincronización agresiva en tiempo real (cada 10m) para mantener plantillas, lesiones y proyecciones actualizadas instantáneamente.'
                        )}
                      </p>
                      
    </div>
                    
    </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {/* TOGGLE SWITCH */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-neutral-400">Auto-Sync (Tiempo Real)</span>
                      <button
                        id="auto-sync-toggle"
                        type="button"
                        onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-orange-500/50 ${
                          isAutoSyncEnabled ? 'bg-orange-600' : 'bg-neutral-800'
                        }`}
                      >
                        <span className="sr-only">Toggle Auto-Sync</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isAutoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      
    </div>
                    
    </div>
                  
    </div>

                {/* APP PREFERENCES PANEL */}
                <AppPreferences categoryPrefs={categoryPrefs} onChange={handleCategoryPrefsChange} />

                {activeTab === 'roster' && selectedTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <TeamWeeklyChart roster={selectedTeam.roster} teamName={selectedTeam.name} categoryPrefs={categoryPrefs} />
                    <RosterList roster={selectedTeam.roster} teamName={selectedTeam.name} categoryPrefs={categoryPrefs} />
                    {(!myTeamId || selectedTeam.id === myTeamId) ? (
                      <LineupOptimizer
                        roster={selectedTeam.roster}
                        teamName={selectedTeam.name}
                        getFullUrl={getFullUrl}
                      />
                    ) : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 text-center">
                        <p className="text-neutral-500 text-sm">{language === 'es' ? 'La optimización de alineación (IA) solo está disponible para tu equipo principal.' : 'AI Lineup Optimization is only available for your main team.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                
                {activeTab === 'myteam' && league && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <MyTeamEditor 
                      league={league}
                      myTeamId={myTeamIds[league.id]}
                      onSetMyTeam={(teamId) => {
                        setMyTeamIds(prev => ({ ...prev, [league.id]: teamId }));
                      }}
                      language={language}
                      onUpdateTeam={(updatedTeam) => {
                        if (league) {
                          const newTeams = league.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t);
                          setLeague({ ...league, teams: newTeams });
                        }
                      }}
                    />
                  </motion.div>
                )}
                
                {activeTab === 'compare' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {myTeam ? <PlayerComparison roster={myTeam.roster} /> : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === 'trades' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <TradeAnalyzer
                      teams={league.teams}
                      categoryPrefs={categoryPrefs}
                      myTeamId={myTeamId}
                      language={language}
                      getFullUrl={getFullUrl}
                    />
                  </motion.div>
                )}
                {activeTab === 'news' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <NewsFeed
                      alerts={news}
                      onRefresh={fetchNews}
                      onMarkRead={handleMarkNewsRead}
                      onSimulate={handleSimulateNews}
                      teams={league?.teams || []}
                      getFullUrl={getFullUrl}
                    />
                  </motion.div>
                )}
                {activeTab === 'draft' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <DraftAdvisor getFullUrl={getFullUrl} />
                  </motion.div>
                )}
                {activeTab === 'opponent' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {!myTeam ? (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    ) : opponentTeam ? (
                      <OpponentForecast
                        userTeam={myTeam}
                        opponentTeam={opponentTeam}
                        categoryPrefs={categoryPrefs}
                        getFullUrl={getFullUrl}
                      />
                    ) : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
                        <h4 className="text-sm font-bold text-neutral-200">{language === 'es' ? 'No se encontró rival para esta semana' : 'No opponent found for this week'}</h4>
                        <p className="text-xs text-neutral-400">
                          {language === 'es' ? 'No hay ningún enfrentamiento registrado en la liga para tu equipo en la semana actual.' : 'There is no matchup registered in the league for your team this week.'}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
{activeTab === 'waiver' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {myTeam ? (
                      <WaiverWire
                        roster={myTeam.roster}
                        categoryPrefs={categoryPrefs}
                        getFullUrl={getFullUrl}
                      />
                    ) : (
                      <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-8 text-center">
                         <p className="text-neutral-400">{language === 'es' ? 'Selecciona tu equipo principal en "Mi Equipo" primero.' : 'Select your main team in "My Team" first.'}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                
    </div>
              
    </div>
            
    </div>
        )}
      </main>
      <footer className="border-t border-neutral-900 py-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500">
          <p>© 2026 ESPN Fantasy Basketball Sync & Analyzer • Potenciado por Inteligencia Artificial de Google Gemini</p>
        </div>
      </footer>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        setLanguage={setLanguage}
        savedLeagues={savedLeagues}
        onDeleteLeague={handleDeleteLeague}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        onTestConnection={handleTestConnection}
      />
    </div>
  );
}
