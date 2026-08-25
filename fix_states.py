import re

with open("src/App.tsx", "r") as f:
    text = f.read()

text = text.replace("const [isLoading, setIsLoading] = useState<boolean>(true);", "const [isLoading, setIsLoading] = useState<boolean>(false);")
text = text.replace("const [syncSuccess, setSyncSuccess] = useState<boolean>(true);", "const [syncSuccess, setSyncSuccess] = useState<boolean>(false);")
# isDemo was true by default in the original code, but wait, let me see what it was.
# In task-156 logs from earlier: "const [isDemo, setIsDemo] = useState<boolean>(true);" Yes, it was true.
# isAutoSyncEnabled should remain true.

with open("src/App.tsx", "w") as f:
    f.write(text)

