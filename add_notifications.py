import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Add imports
# Make sure useRef is imported
if "useRef" not in text.split("import {")[1].split("}")[0]:
    text = text.replace("import { useState, useEffect", "import { useState, useEffect, useRef")
# I'll just be safe
if "useRef" not in text:
    text = text.replace("import { useState, useEffect", "import { useState, useEffect, useRef")

# Inject states and effect
notification_logic = """  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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

"""

text = re.sub(r"(  const \[activeTab, setActiveTab\] = useState.*?;\n)", r"\1" + notification_logic, text)

# Inject the button
button_ui = """            <div className="flex items-center gap-4">
              <button 
                onClick={handleEnableNotifications}
                className={`p-2 rounded-lg border flex items-center gap-2 transition ${notificationsEnabled ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
                title={notificationsEnabled ? (language === 'es' ? 'Notificaciones Activadas' : 'Notifications Enabled') : (language === 'es' ? 'Activar Notificaciones' : 'Enable Notifications')}
              >
                <Bell className={`w-4 h-4 ${notificationsEnabled ? 'fill-orange-400' : ''}`} />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                  {notificationsEnabled ? (language === 'es' ? 'Alertas ON' : 'Alerts ON') : (language === 'es' ? 'Alertas OFF' : 'Alerts OFF')}
                </span>
              </button>"""

text = text.replace("""            <div className="flex items-center gap-4">""", button_ui)

with open("src/App.tsx", "w") as f:
    f.write(text)

