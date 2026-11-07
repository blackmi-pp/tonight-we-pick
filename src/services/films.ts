import { jsonp } from './jsonp';

/**
 * Film/series suggestions from the iTunes Search API (free, no key; JSONP because it has no CORS).
 * https://performance-partners.apple.com/search-api
 */
export interface Film {
  id: number;
  title: string;
  year: string;
  genre: string;
  poster: string;
  blurb: string;
  url: string;
  minutes: number | null;
}

interface ItunesItem {
  trackId?: number;
  collectionId?: number;
  trackName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  longDescription?: string;
  shortDescription?: string;
  description?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  trackTimeMillis?: number;
}

/** 心情 → iTunes genre term. */
export const MOOD_GENRES: Record<string, string[]> = {
  輕鬆搞笑: ['Comedy'],
  緊張刺激: ['Thriller', 'Action & Adventure'],
  喊一場: ['Drama', 'Romance'],
  長知識: ['Documentary'],
};
const DEFAULT_GENRES = ['Comedy', 'Drama', 'Action & Adventure', 'Thriller', 'Romance', 'Sci-Fi & Fantasy'];

export type FilmKind = 'movie' | 'tv';

export function buildUrl(kind: FilmKind, genre: string): string {
  const p = new URLSearchParams({
    term: genre,
    attribute: kind === 'movie' ? 'genreTerm' : 'genreIndex',
    media: kind === 'movie' ? 'movie' : 'tvShow',
    entity: kind === 'movie' ? 'movie' : 'tvSeason',
    country: 'hk',
    limit: '60',
  });
  if (kind === 'tv') p.delete('attribute');
  return `https://itunes.apple.com/search?${p}`;
}

/** Pure: cleans the payload, prefers recent titles, de-duplicates. */
export function parseFilms(raw: unknown): Film[] {
  const results = ((raw as { results?: ItunesItem[] })?.results ?? []).filter(Boolean);
  const seen = new Set<string>();
  const out: Film[] = [];
  for (const r of results) {
    const title = r.trackName ?? r.collectionName;
    const id = r.trackId ?? r.collectionId;
    if (!title || !id || seen.has(title)) continue;
    seen.add(title);
    out.push({
      id,
      title,
      year: (r.releaseDate ?? '').slice(0, 4),
      genre: r.primaryGenreName ?? '',
      poster: (r.artworkUrl100 ?? '').replace('100x100', '300x300'),
      blurb: (r.longDescription ?? r.shortDescription ?? r.description ?? '').replace(/<[^>]+>/g, '').slice(0, 220),
      url: r.trackViewUrl ?? r.collectionViewUrl ?? '',
      minutes: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 60000) : null,
    });
  }
  return out.sort((a, b) => b.year.localeCompare(a.year));
}

/** Picks `n` random items from the newest half, so suggestions feel fresh but vary each time. */
export function pickSome<T>(xs: T[], n: number, rand: () => number = Math.random): T[] {
  const pool = xs.slice(0, Math.max(n, Math.ceil(xs.length / 2)));
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

export async function suggestFilms(kind: FilmKind, mood: string | undefined, maxMinutes?: number): Promise<Film[]> {
  const genres = (mood && MOOD_GENRES[mood]) || DEFAULT_GENRES;
  const genre = genres[Math.floor(Math.random() * genres.length)]!;
  const films = parseFilms(await jsonp(buildUrl(kind, genre)));
  const fit = maxMinutes ? films.filter((f) => f.minutes === null || f.minutes <= maxMinutes) : films;
  return pickSome(fit.length >= 3 ? fit : films, 3);
}
