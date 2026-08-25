async function fetchPlayer() {
  const url = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2024/players?scoringPeriodId=0&view=kona_player_info";
  const res = await fetch(url, { headers: { 'x-fantasy-filter': '{"players":{"filterSlotIds":{"value":[0,1,2,3,4,5,6,7,8,9,10,11]},"filterStatsForCurrentSeasonScoringPeriodId":{"value":[0]},"sortAppliedStatTotal":{"sortAsc":false,"sortPriority":1,"value":"002024"},"sortDraftRanks":{"sortPriority":100,"sortAsc":true,"value":"STANDARD"},"filterLimit":{"value":1}}}' }});
  const data = await res.json();
  const p = data.players[0].player;
  console.log("Player name:", p.fullName);
  const stat = p.stats.find(s => s.id === "002024");
  console.log("Stats:", Object.keys(stat.stats).map(k => `${k}: ${stat.stats[k]}`).join(', '));
}
fetchPlayer();
