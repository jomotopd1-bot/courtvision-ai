import re

with open("src/components/TradeAnalyzer.tsx", "r") as f:
    text = f.read()

# Add myTeamId to props
interface_mod = """interface TradeAnalyzerProps {
  teams: FantasyTeam[];
  categoryPrefs?: Record<string, boolean>;
  myTeamId?: string;
  language?: 'es' | 'en';
}"""
text = re.sub(r"interface TradeAnalyzerProps \{.*?\n\}", interface_mod, text, flags=re.DOTALL)

# Add myTeamId to component signature
text = text.replace("export default function TradeAnalyzer({ teams, categoryPrefs }: TradeAnalyzerProps) {", "export default function TradeAnalyzer({ teams, categoryPrefs, myTeamId, language = 'es' }: TradeAnalyzerProps) {")

# Set team1Id to myTeamId on mount, and lock it if myTeamId is provided
sync_dropdowns = """  // Synchronize dropdowns
  useEffect(() => {
    if (myTeamId) {
      setTeam1Id(myTeamId);
      if (teams.length > 1) {
        const otherTeam = teams.find(t => t.id !== myTeamId);
        if (otherTeam && !team2Id) setTeam2Id(otherTeam.id);
      }
    } else {
      if (!team1Id && teams[0]) {
        setTeam1Id(teams[0].id);
      }
      if (!team2Id && teams[1]) {
        setTeam2Id(teams[1].id);
      }
    }
  }, [teams, myTeamId]);"""
text = re.sub(r"  // Synchronize dropdowns if they are empty\n  useMemo\(\(\) => \{.*?\n  \}, \[teams\]\);", sync_dropdowns, text, flags=re.DOTALL)

# Change the select for team1Id to be disabled if myTeamId is set
select_team1 = """            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{language === 'es' ? 'Tu Equipo (Línea Naranja)' : 'Your Team (Orange Line)'}</label>
            <select
              id="select-compare-team-1"
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
              disabled={!!myTeamId}
              className={`w-full bg-neutral-950 text-xs font-semibold text-neutral-200 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus:border-orange-500 focus:outline-none transition ${myTeamId ? 'opacity-70 cursor-not-allowed' : ''}`}
            >"""
text = re.sub(r"            <label className=\"text-\[10px\] font-bold text-neutral-400 uppercase tracking-wider\">Primer Equipo \(Línea Naranja\)<\/label>\n            <select\n              id=\"select-compare-team-1\"\n              value=\{team1Id\}\n              onChange=\{\(e\) => setTeam1Id\(e.target.value\)\}\n              className=\"w-full bg-neutral-950 text-xs font-semibold text-neutral-200 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus:border-orange-500 focus:outline-none transition\"\n            >", select_team1, text)


with open("src/components/TradeAnalyzer.tsx", "w") as f:
    f.write(text)

