export interface Player {
  id: string;
  name: string;
  nbaTeam: string;
  positions: string[]; // e.g. ["PG", "SG"]
  injuryStatus: 'ACTIVE' | 'OUT' | 'QUESTIONABLE' | 'DAY_TO_DAY';
  injuryDetails?: string;
  stats: {
    pts: number;
    ast: number;
    reb: number;
    stl: number;
    blk: number;
    tov: number;
    fgm: number;
    fga: number;
    ftm: number;
    fta: number;
    tpm: number; // 3 PM
  };
  projections: {
    pts: number;
    ast: number;
    reb: number;
    stl: number;
    blk: number;
    tpm: number;
  };
}

export interface FantasyTeam {
  id: string;
  name: string;
  owner: string;
  roster: Player[];
  logo?: string;
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
  ranking: number;
}

export interface Matchup {
  matchupPeriod: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
}

export interface League {
  id: string;
  name: string;
  seasonId: string;
  isPrivate: boolean;
  settings: {
    scoringType: 'H2H_POINTS' | 'H2H_CATEGORIES';
    rosterSize: number;
    activePositions: string[];
  };
  teams: FantasyTeam[];
  matchups: Matchup[];
  currentPeriod: number;
}

export interface TradeSuggestion {
  id: string;
  proposerTeamId: string;
  proposerTeamName: string;
  receiverTeamId: string;
  receiverTeamName: string;
  proposerSends: Player[];
  receiverSends: Player[];
  mlAnalysis: {
    summary: string;
    proposerBenefit: string;
    receiverBenefit: string;
    verdict: 'EXCELLENT' | 'FAVORABLE' | 'RISKY' | 'UNEVEN';
    scoreChangeProposer: number; // e.g. +5.2
    scoreChangeReceiver: number; // e.g. +3.8
    modelUsed?: string;
  };
}

export interface NewsAlert {
  id: string;
  timestamp: string; // ISO string
  title: string;
  content: string;
  type: 'injury' | 'breaking' | 'lineup';
  affectedPlayer?: string;
  severity: 'critical' | 'warning' | 'info';
  read?: boolean;
}

export interface DraftRecommendation {
  summary: string;
  recommendedPicks?: Array<{ name: string; team: string; reason: string; expectedRound: string }>;
  sleepers: Array<{ name: string; team: string; reason: string; expectedRound: string }>;

  rookies: Array<{ name: string; team: string; reason: string; expectedRound: string }>;
  breakouts: Array<{ name: string; team: string; reason: string; expectedRound: string }>;
  puntStrategyAdvice: string;
  modelUsed?: string;
}

export interface WaiverRecommendation {
  weakestCategories: Array<{
    category: string;
    average: number;
    targetAverage: number;
    description: string;
  }>;
  recommendedPlayers: Array<{
    id: string;
    name: string;
    nbaTeam: string;
    positions: string[];
    stats: {
      pts: number;
      ast: number;
      reb: number;
      stl: number;
      blk: number;
      tpm: number;
    };
    fitScore: number;
    reason: string;
    impactDescription: string;
  }>;
  aiVerdict: string;
  modelUsed?: string;
}

export interface OpponentForecast {
  categoryComparisons: Array<{
    category: string;
    categoryLabel: string;
    userAverage: number;
    opponentAverage: number;
    advantage: 'user' | 'opponent' | 'even';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }>;
  highRiskCategories: Array<{
    category: string;
    categoryLabel: string;
    userAverage: number;
    opponentAverage: number;
    reason: string;
  }>;
  aiVerdict: string;
  keyRivalPlayers: Array<{
    name: string;
    statsHighlight: string;
    threatDescription: string;
  }>;
  recentFormPredictions?: Array<{
    category: string;
    categoryLabel: string;
    userRecentAverage: number;
    opponentRecentAverage: number;
    predictedWinner: 'user' | 'opponent' | 'even';
    winProbability: number;
    reasoning: string;
  }>;
  modelUsed?: string;
}



export interface SavedLeague {
  leagueId: string;
  seasonId: string;
  swid?: string;
  espnS2?: string;
  name?: string;
}
