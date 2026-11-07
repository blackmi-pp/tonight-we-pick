export type Person = 'A' | 'B';
export type Category = 'eat' | 'go' | 'watch' | 'custom';

/** A secret vote. `null` / missing means "didn't vote" and counts as neutral. */
export type Vote = 'love' | 'yes' | 'ok' | 'no';
export type Votes = Record<Person, Record<string, Vote | undefined>>;

/** Answers on the conditions screen: group title → chosen label. */
export type Conditions = Record<string, string | undefined>;

export type HistoryEntry =
  | {
      id: string;
      kind: 'pick';
      category: Category;
      option: string;
      ts: number;
      /** What each person voted for the winner (only when the round had votes). Feeds the 遷就帳簿. */
      votes?: Partial<Record<Person, Vote>>;
      /** Afterwards: was it good? Feeds future odds. */
      rating?: Rating;
    }
  | {
      id: string;
      kind: 'chore';
      chore: string;
      who: Person;
      pts: number;
      ts: number;
      /** How the assignment ended up with `who`. */
      via?: 'draw' | 'swap' | 'skipCard' | 'sick';
    }
  | {
      id: string;
      kind: 'skipCard';
      who: Person;
      chore: string;
      ts: number;
    };

export type Rating = 'up' | 'down';

export interface Chore {
  name: string;
  pts: number;
}
