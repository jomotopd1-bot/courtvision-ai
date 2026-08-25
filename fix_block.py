import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Remove the notification logic from the top
notification_logic_start = "  const [notificationsEnabled, setNotificationsEnabled] = useState(false);"
notification_logic_end = "  }, [myTeam, notificationsEnabled, language]);"

start_idx = text.find(notification_logic_start)
end_idx = text.find(notification_logic_end) + len(notification_logic_end)

if start_idx != -1 and end_idx != -1:
    extracted_logic = text[start_idx:end_idx]
    text = text[:start_idx] + text[end_idx:]

    # Now find where myTeam is defined
    my_team_def = "  const myTeam = league?.teams.find(t => t.id === myTeamId) || null;"
    my_team_idx = text.find(my_team_def) + len(my_team_def)
    
    text = text[:my_team_idx] + "\n\n" + extracted_logic + text[my_team_idx:]
    
    with open("src/App.tsx", "w") as f:
        f.write(text)

