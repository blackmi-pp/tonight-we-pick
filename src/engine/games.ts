import type { Person } from './types';

export type Hand = 'rock' | 'paper' | 'scissors';
export const HANDS: Hand[] = ['rock', 'paper', 'scissors'];
export const HAND_LABEL: Record<Hand, { emoji: string; name: string }> = {
  rock: { emoji: '✊', name: '揼' },
  paper: { emoji: '✋', name: '包' },
  scissors: { emoji: '✌️', name: '剪' },
};

const BEATS: Record<Hand, Hand> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

/** 包剪揼: the winner, or null on a draw. */
export function rpsWinner(a: Hand, b: Hand): Person | null {
  if (a === b) return null;
  return BEATS[a] === b ? 'A' : 'B';
}

/** Best of N: who has won a majority, or null while undecided. */
export function bestOf(rounds: (Person | null)[], n = 3): Person | null {
  const need = Math.floor(n / 2) + 1;
  const a = rounds.filter((r) => r === 'A').length;
  const b = rounds.filter((r) => r === 'B').length;
  return a >= need ? 'A' : b >= need ? 'B' : null;
}

/** 停錶挑戰: closest to the target wins; exact tie → null (play again). */
export const STOP_TARGET_MS = 5000;
export function stopWinner(a: number, b: number, target = STOP_TARGET_MS): Person | null {
  const da = Math.abs(a - target);
  const db = Math.abs(b - target);
  if (da === db) return null;
  return da < db ? 'A' : 'B';
}

/** 撳快啲: more taps wins. */
export function tapWinner(a: number, b: number): Person | null {
  return a === b ? null : a > b ? 'A' : 'B';
}
