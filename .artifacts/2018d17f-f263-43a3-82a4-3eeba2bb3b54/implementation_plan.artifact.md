# Fix AI Functions in Backend

The AI analysis functions in `server.ts` are failing due to several logic errors in data processing and fragile integration with the Gemini API.

## User Review Required

> [!IMPORTANT]
> A `GEMINI_API_KEY` is required for the AI functions to work. Please ensure you have a `.env` file in the root directory with this key, or set it in your hosting environment (e.g., Render).

## Proposed Changes

### Backend (`server.ts`)

#### [MODIFY] [server.ts](file:///C:/espn-fantasy-basketball%20analyzer/server.ts)
- **Fix `compactTeams`**: Rename to `compactData` and update it to handle both lists of teams and lists of players (rosters).
- **Include All Stats**: Update the data reduction logic to include all 9 standard categories (`pts`, `reb`, `ast`, `stl`, `blk`, `tpm`, `tov`, `fgPct`, `ftPct`) so the AI has a complete picture.
- **Improve `askAI`**:
    - Prioritize `gemini-1.5-flash` as it is faster and supports JSON mode more reliably.
    - Use System Instructions or enhanced prompt headers to enforce JSON output.
    - Improve error logging to identify if the API key is invalid or if the model failed.
- **Robust `extractJSON`**: Use a more resilient regex-based extraction to find JSON blocks within the AI response.

### Helper Scripts

#### [MODIFY] [test_ai.ts](file:///C:/espn-fantasy-basketball%20analyzer/test_ai.ts)
- Fix the package import from `@google/genai` to `@google/generative-ai`.

## Verification Plan

### Automated Tests
- I will create a small scratch script to test the `compactData` and `extractJSON` functions with mock data.
- Run `npm run lint` to ensure no TypeScript errors were introduced.

### Manual Verification
- Ask the user to check the "AI Analysis" tabs in the app (Draft, Waiver, Trades) once the server is restarted.
- Check the server console for "Key exists: true" and successful API call logs.
