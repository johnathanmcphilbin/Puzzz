// Shared room/game state utilities
// Use these helpers to enforce consistent state updates and guards across games

import { safeDeepMerge } from '@/utils/functions';

// Apply a partial gameState patch using onUpdateRoom. Never replace whole object.
export async function applyGameStatePatch(
  onUpdateRoom: (updates: any) => Promise<void> | void,
  patch: Record<string, any>
) {
  // Ensure only gameState patch is sent; merging is handled in useRoom.updateRoom
  return await onUpdateRoom({ gameState: patch });
}

// Guard: ignore client actions if expected phase doesn't match current phase
export function phaseGuard(currentPhase: string | undefined, expected: string | string[]) {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.includes(currentPhase || '');
}

// Presence filter: exclude disconnected/eliminated players from counts/votes
// Looks for common flags across game states
export function getActivePlayers(
  players: Array<{ player_id?: string; id?: string; eliminated?: boolean }>,
  gameState?: any
) {
  const eliminatedSet = new Set<string>([
    ...(gameState?.eliminatedPlayerIds || []),
  ]);
  const disconnectedSet = new Set<string>([
    ...(gameState?.disconnectedPlayerIds || []),
  ]);

  return players.filter((p) => {
    const pid = (p as any).player_id || (p as any).id;
    const isEliminated = Boolean((p as any).eliminated) || eliminatedSet.has(pid);
    const isDisconnected = disconnectedSet.has(pid);
    return !isEliminated && !isDisconnected;
  });
}

// Merge helper in case local components need to compose nested state before sending
export function mergeLocalGameState<T extends Record<string, any>>(current: T, patch: Partial<T>): T {
  return safeDeepMerge(current, patch as any);
}
