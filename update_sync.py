import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# Change handleSync to take isBackground
handle_sync_old = """  const handleSync = async (params: { leagueId: string; seasonId: string; swid?: string; espnS2?: string }) => {
    setLastSyncParams(params);
    setTimeLeft(15);
    setIsLoading(true);
    setError(null);
    setSyncSuccess(false);"""

handle_sync_new = """  const handleSync = async (params: { leagueId: string; seasonId: string; swid?: string; espnS2?: string }, isBackground = false) => {
    setLastSyncParams(params);
    setTimeLeft(15);
    if (!isBackground) {
      setIsLoading(true);
      setError(null);
      setSyncSuccess(false);
    }"""

text = text.replace(handle_sync_old, handle_sync_new)

# Update interval call to use isBackground = true
interval_old = """        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSyncRef.current(lastSyncParams);"""

interval_new = """        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSyncRef.current(lastSyncParams, true);"""

text = text.replace(interval_old, interval_new)

# Stop the finally block from clearing isLoading if it wasn't set?
# Actually, if we just set it to false, it's fine.
finally_old = """    } finally {
      setIsLoading(false);
    }"""

finally_new = """    } finally {
      if (!isBackground) setIsLoading(false);
    }"""

text = text.replace(finally_old, finally_new)

with open("src/App.tsx", "w") as f:
    f.write(text)

