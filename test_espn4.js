async function fetchPlayer() {
  const url = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2024/players?view=players_wl";
  const res = await fetch(url);
  const data = await res.json();
  const p = data[0];
  console.log("Player:", p.fullName);
}
fetchPlayer();
