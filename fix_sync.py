import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Change from 30 minutes (1800s) to Real-time (15s)
text = text.replace("const [timeLeft, setTimeLeft] = useState<number>(1800); // 1800 seconds = 30 minutes", "const [timeLeft, setTimeLeft] = useState<number>(15); // 15 seconds for real-time sync")
text = text.replace("setTimeLeft(1800);", "setTimeLeft(15);")
text = text.replace("return 1800;", "return 15;")

text = text.replace("Auto-Sync (30 min)", "Auto-Sync (Tiempo Real)")
text = text.replace("'Mantiene las plantillas, lesiones y proyecciones de NBA Fantasy sincronizadas automáticamente cada 30 minutos.'", "'Sincronización agresiva en tiempo real (cada 15s) para mantener plantillas, lesiones y proyecciones actualizadas instantáneamente.'")

with open("src/App.tsx", "w") as f:
    f.write(text)

