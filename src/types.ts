export type Player = { id: string; name: string };
export type Team = { id: string; name: string; players: Player[]; captainId?: string | null };
export type MatchState = 'setup' | 'toss' | 'innings1_setup' | 'innings1' | 'innings2_setup' | 'innings2' | 'result';

export type BatterStats = {
  id: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'yetToBat' | 'batting' | 'out' | 'retiredOut';
};

export type BowlerStats = {
  id: string;
  balls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
};

export type Innings = {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  balls: number;
  extras: { wides: number; noBalls: number; total: number };
  batters: Record<string, BatterStats>;
  bowlers: Record<string, BowlerStats>;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  isComplete: boolean;
};

export type AppState = {
  matchState: MatchState;
  teams: Team[];
  overs: number;
  toss: { wonBy: string | null; electedTo: 'bat' | 'bowl' | null };
  innings1: Innings | null;
  innings2: Innings | null;
  auditLog: string[];
  past?: Omit<AppState, 'past'>[];
};
