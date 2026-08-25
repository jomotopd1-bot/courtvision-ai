async function fetchPlayer() {
  const url = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2024/players?scoringPeriodId=0&view=players_wl";
  const res = await fetch(url, { headers: { 'x-fantasy-filter': '{"filterActive": {"value": true}, "filterLimit": {"value": 5}}' }});
  const data = await res.json();
  const p = data[0];
  console.log("Player name:", p.fullName);
  console.log("Stats obj keys:", Object.keys(p.stats?.[0]?.stats || {}));
  console.log("Stats:", p.stats?.[0]?.stats);
}
fetchPlayer();
