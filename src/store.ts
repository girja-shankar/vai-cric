import { AppState, Team, Innings, BatterStats, BowlerStats } from './types';

export type Action =
  | { type: 'START_MATCH'; teams: Team[]; overs: number }
  | { type: 'RECORD_TOSS'; wonBy: string; electedTo: 'bat' | 'bowl' }
  | { type: 'START_INNINGS'; strikerId: string; nonStrikerId: string; bowlerId: string }
  | { type: 'RECORD_DELIVERY'; runs: number; deliveryType: 'normal' | 'wide' | 'noBall' | 'wicket'; wicketDetails?: { outBatsmanId: string; outType: 'out' | 'retiredOut'; nextBatsmanId: string | null; forcedNextStrikerId?: string } }
  | { type: 'CHANGE_BOWLER'; bowlerId: string }
  | { type: 'END_INNINGS' }
  | { type: 'RESET_MATCH' }
  | { type: 'UNDO' }
  | { type: 'UPDATE_MATCH_SETTINGS'; teams: Team[]; overs: number }
  | { type: 'GO_BACK' }
  | { type: 'RESTORE_STATE'; state: AppState };

const createInitialInnings = (battingTeamId: string, bowlingTeamId: string, teams: Team[]): Innings => {
  const batters: Record<string, BatterStats> = {};
  const bowlers: Record<string, BowlerStats> = {};

  const battingTeam = teams.find(t => t.id === battingTeamId)!;
  const bowlingTeam = teams.find(t => t.id === bowlingTeamId)!;

  battingTeam.players.forEach(p => {
    batters[p.id] = { id: p.id, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'yetToBat' };
  });

  bowlingTeam.players.forEach(p => {
    bowlers[p.id] = { id: p.id, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };
  });

  return {
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, total: 0 },
    batters,
    bowlers,
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,
    isComplete: false,
  };
};

export const initialState: AppState = {
  matchState: 'setup',
  teams: [],
  overs: 10,
  toss: { wonBy: null, electedTo: null },
  innings1: null,
  innings2: null,
  auditLog: [],
};

const baseReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'START_MATCH':
      return { ...state, matchState: 'toss', teams: action.teams, overs: action.overs, auditLog: ['Match started'] };
    case 'RECORD_TOSS': {
      const battingTeamId = action.electedTo === 'bat' ? action.wonBy : state.teams.find(t => t.id !== action.wonBy)!.id;
      const bowlingTeamId = state.teams.find(t => t.id !== battingTeamId)!.id;
      const wonByName = state.teams.find(t => t.id === action.wonBy)?.name;
      return {
        ...state,
        matchState: 'innings1_setup',
        toss: { wonBy: action.wonBy, electedTo: action.electedTo },
        innings1: createInitialInnings(battingTeamId, bowlingTeamId, state.teams),
        auditLog: [...(state.auditLog || []), `Toss won by ${wonByName}, elected to ${action.electedTo}`],
      };
    }
    case 'START_INNINGS': {
      const isFirstInnings = state.matchState === 'innings1_setup';
      const inningsKey = isFirstInnings ? 'innings1' : 'innings2';
      const innings = state[inningsKey]!;

      return {
        ...state,
        matchState: isFirstInnings ? 'innings1' : 'innings2',
        auditLog: [...(state.auditLog || []), `${isFirstInnings ? '1st' : '2nd'} Innings started`],
        [inningsKey]: {
          ...innings,
          strikerId: action.strikerId,
          nonStrikerId: action.nonStrikerId,
          bowlerId: action.bowlerId,
          batters: {
            ...innings.batters,
            [action.strikerId]: { ...innings.batters[action.strikerId], status: 'batting' },
            [action.nonStrikerId]: { ...innings.batters[action.nonStrikerId], status: 'batting' },
          },
        },
      };
    }
    case 'RECORD_DELIVERY': {
      const isFirstInnings = state.matchState === 'innings1';
      const inningsKey = isFirstInnings ? 'innings1' : 'innings2';
      const innings = state[inningsKey]!;

      let { runs, wickets, balls, extras, batters, bowlers, strikerId, nonStrikerId, bowlerId } = innings;

      if (!strikerId || !bowlerId) return state;

      const striker = { ...batters[strikerId] };
      const bowler = { ...bowlers[bowlerId] };
      const newExtras = { ...extras };

      let isLegalDelivery = true;
      let runsToAdd = action.runs;
      let rotateStrike = action.runs % 2 !== 0;

      const isRetiredOut = action.deliveryType === 'wicket' && action.wicketDetails?.outType === 'retiredOut';
      if (isRetiredOut) {
        // Retirement happens between deliveries — no ball, no runs
        isLegalDelivery = false;
        runsToAdd = 0;
        rotateStrike = false;
      } else if (action.deliveryType === 'wide') {
        isLegalDelivery = false;
        newExtras.wides += 1;
        newExtras.total += 1;
        runsToAdd += 1;
        bowler.wides += 1;
        rotateStrike = action.runs % 2 !== 0;
      } else if (action.deliveryType === 'noBall') {
        isLegalDelivery = false;
        newExtras.noBalls += 1;
        newExtras.total += 1;
        runsToAdd += 1;
        bowler.noBalls += 1;
        rotateStrike = action.runs % 2 !== 0;
      }

      runs += runsToAdd;
      bowler.runs += runsToAdd;

      if (isLegalDelivery) {
        balls += 1;
        bowler.balls += 1;
        striker.balls += 1;
      } else if (action.deliveryType === 'noBall') {
        striker.balls += 1;
      }

      if (!isRetiredOut && (action.deliveryType === 'normal' || action.deliveryType === 'noBall' || action.deliveryType === 'wicket')) {
        striker.runs += action.runs;
        if (action.runs === 4) striker.fours += 1;
        if (action.runs === 6) striker.sixes += 1;
      }

      let newStrikerId = strikerId;
      let newNonStrikerId = nonStrikerId;

      const battingTeam = state.teams.find(t => t.id === innings.battingTeamId)!;
      const bowlingTeam = state.teams.find(t => t.id === innings.bowlingTeamId)!;
      
      const maxWickets = battingTeam.players.length;

      const strikerName = battingTeam.players.find(p => p.id === strikerId)?.name || 'Batter';
      const bowlerName = bowlingTeam.players.find(p => p.id === bowlerId)?.name || 'Bowler';
      
      const overString = `${Math.floor(innings.balls / 6)}.${(innings.balls % 6) + (isLegalDelivery ? 1 : 0)}`;
      let logMsg = isRetiredOut
        ? `[${isFirstInnings ? '1st' : '2nd'} Inn] ${overString}: `
        : `[${isFirstInnings ? '1st' : '2nd'} Inn] ${overString}: ${bowlerName} to ${strikerName} - `;

      if (action.deliveryType === 'wicket' && action.wicketDetails) {
        if (!isRetiredOut) {
          wickets += 1;
          bowler.wickets += 1;
        }
        const outBatsmanId = action.wicketDetails.outBatsmanId;
        const outBatsman = outBatsmanId === strikerId ? striker : { ...batters[outBatsmanId] };
        outBatsman.status = action.wicketDetails.outType;
        batters = { ...batters, [outBatsmanId]: outBatsman };

        const outName = battingTeam.players.find(p => p.id === outBatsmanId)?.name;
        logMsg += action.runs > 0
          ? `${action.runs} run${action.runs > 1 ? 's' : ''} + WICKET! (${outName} ${action.wicketDetails.outType})`
          : `WICKET! (${outName} ${action.wicketDetails.outType})`;

        if (outBatsmanId === strikerId) {
          if (action.wicketDetails.nextBatsmanId) {
            newStrikerId = action.wicketDetails.nextBatsmanId;
          } else {
            // Last man standing: non-striker becomes sole batsman
            newStrikerId = newNonStrikerId;
            newNonStrikerId = null;
          }
        } else {
          newNonStrikerId = action.wicketDetails.nextBatsmanId; // null if no replacement
        }
        
        if (action.wicketDetails.nextBatsmanId) {
            batters = {
                ...batters,
                [action.wicketDetails.nextBatsmanId]: { ...batters[action.wicketDetails.nextBatsmanId], status: 'batting' }
            };
        }
      } else if (action.deliveryType === 'wide') {
        logMsg += `${action.runs} runs + 1 Wide`;
      } else if (action.deliveryType === 'noBall') {
        logMsg += `${action.runs} runs + 1 No Ball`;
      } else {
        logMsg += `${action.runs} runs`;
      }

      batters = { ...batters, [strikerId]: striker };
      bowlers = { ...bowlers, [bowlerId]: bowler };

      if (rotateStrike && newStrikerId && newNonStrikerId) {
        const temp = newStrikerId;
        newStrikerId = newNonStrikerId;
        newNonStrikerId = temp;
      }

      // Override with manually selected next striker if specified
      if (action.wicketDetails?.forcedNextStrikerId && newStrikerId && newNonStrikerId) {
        if (action.wicketDetails.forcedNextStrikerId === newNonStrikerId) {
          const temp = newStrikerId;
          newStrikerId = newNonStrikerId;
          newNonStrikerId = temp;
        }
      }

      const isEndOfOver = isLegalDelivery && balls % 6 === 0;
      if (isEndOfOver && newStrikerId && newNonStrikerId) {
        const temp = newStrikerId;
        newStrikerId = newNonStrikerId;
        newNonStrikerId = temp;
      }

      const newInnings = {
        ...innings,
        runs,
        wickets,
        balls,
        extras: newExtras,
        batters,
        bowlers,
        strikerId: newStrikerId,
        nonStrikerId: newNonStrikerId,
      };

      const isAllOut = wickets >= maxWickets;
      const isOversComplete = balls >= state.overs * 6;
      let isTargetReached = false;
      if (!isFirstInnings && state.innings1) {
        isTargetReached = runs > state.innings1.runs;
      }

      const newAuditLog = [...(state.auditLog || []), logMsg];

      if (isAllOut || isOversComplete || isTargetReached) {
        newInnings.isComplete = true;
        if (isAllOut) newAuditLog.push(`Innings ended: All out`);
        else if (isOversComplete) newAuditLog.push(`Innings ended: Overs complete`);
        else if (isTargetReached) newAuditLog.push(`Innings ended: Target reached`);

        return {
          ...state,
          [inningsKey]: newInnings,
          matchState: isFirstInnings ? 'innings2_setup' : 'result',
          ...(isFirstInnings ? { innings2: createInitialInnings(innings.bowlingTeamId, innings.battingTeamId, state.teams) } : {}),
          auditLog: newAuditLog,
        };
      }

      return {
        ...state,
        [inningsKey]: newInnings,
        auditLog: newAuditLog,
      };
    }
    case 'CHANGE_BOWLER': {
      const isFirstInnings = state.matchState === 'innings1';
      const inningsKey = isFirstInnings ? 'innings1' : 'innings2';
      const bowlingTeam = state.teams.find(t => t.id === state[inningsKey]!.bowlingTeamId)!;
      const bowlerName = bowlingTeam.players.find(p => p.id === action.bowlerId)?.name;
      return {
        ...state,
        [inningsKey]: {
          ...state[inningsKey]!,
          bowlerId: action.bowlerId,
        },
        auditLog: [...(state.auditLog || []), `New bowler: ${bowlerName}`],
      };
    }
    case 'END_INNINGS': {
      const isFirstInnings = state.matchState === 'innings1';
      const inningsKey = isFirstInnings ? 'innings1' : 'innings2';
      const innings = state[inningsKey]!;
      return {
        ...state,
        [inningsKey]: { ...innings, isComplete: true },
        matchState: isFirstInnings ? 'innings2_setup' : 'result',
        innings2: isFirstInnings ? createInitialInnings(innings.bowlingTeamId, innings.battingTeamId, state.teams) : state.innings2,
        auditLog: [...(state.auditLog || []), `Innings ended manually`],
      };
    }
    case 'UPDATE_MATCH_SETTINGS': {
      const newState = { ...state, teams: action.teams, overs: action.overs };

      // Update innings batters/bowlers for any active innings
      const updateInnings = (innings: Innings | null): Innings | null => {
        if (!innings) return null;
        const battingTeam = action.teams.find(t => t.id === innings.battingTeamId)!;
        const bowlingTeam = action.teams.find(t => t.id === innings.bowlingTeamId)!;

        const newBatters: Record<string, BatterStats> = {};
        battingTeam.players.forEach(p => {
          newBatters[p.id] = innings.batters[p.id] || { id: p.id, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'yetToBat' };
        });

        const newBowlers: Record<string, BowlerStats> = {};
        bowlingTeam.players.forEach(p => {
          newBowlers[p.id] = innings.bowlers[p.id] || { id: p.id, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };
        });

        return { ...innings, batters: newBatters, bowlers: newBowlers };
      };

      newState.innings1 = updateInnings(state.innings1);
      newState.innings2 = updateInnings(state.innings2);
      newState.auditLog = [...(state.auditLog || []), 'Match settings updated'];
      return newState;
    }
    case 'GO_BACK': {
      switch (state.matchState) {
        case 'toss':
          return { ...state, matchState: 'setup', toss: { wonBy: null, electedTo: null } };
        case 'innings1_setup':
          return { ...state, matchState: 'toss', innings1: null, toss: { wonBy: null, electedTo: null } };
        case 'innings1': {
          const inn = state.innings1!;
          // Reset batter/bowler selections, revert batting statuses
          const resetBatters: Record<string, BatterStats> = {};
          Object.entries(inn.batters).forEach(([id, b]) => {
            resetBatters[id] = b.balls > 0 || b.status === 'out' || b.status === 'retiredOut'
              ? b
              : { ...b, status: 'yetToBat' };
          });
          return {
            ...state,
            matchState: 'innings1_setup',
            innings1: { ...inn, strikerId: null, nonStrikerId: null, bowlerId: null, batters: resetBatters },
          };
        }
        case 'innings2_setup':
          return { ...state, matchState: 'innings1', innings1: { ...state.innings1!, isComplete: false }, innings2: null };
        case 'innings2': {
          const inn = state.innings2!;
          const resetBatters: Record<string, BatterStats> = {};
          Object.entries(inn.batters).forEach(([id, b]) => {
            resetBatters[id] = b.balls > 0 || b.status === 'out' || b.status === 'retiredOut'
              ? b
              : { ...b, status: 'yetToBat' };
          });
          return {
            ...state,
            matchState: 'innings2_setup',
            innings2: { ...inn, strikerId: null, nonStrikerId: null, bowlerId: null, batters: resetBatters },
          };
        }
        default:
          return state;
      }
    }
    case 'RESTORE_STATE':
      return action.state;
    case 'RESET_MATCH':
      return initialState;
    default:
      return state;
  }
};

export const reducer = (state: AppState, action: Action): AppState => {
  if (action.type === 'UNDO') {
    if (!state.past || state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return { ...previous, past: newPast };
  }

  const nextState = baseReducer(state, action);

  if (action.type !== 'RESET_MATCH') {
    const { past, ...stateWithoutPast } = state;
    nextState.past = [...(past || []), stateWithoutPast];
  } else {
    nextState.past = [];
  }

  return nextState;
};
