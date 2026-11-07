/**
 * Hong Kong Observatory open data (no key, CORS enabled):
 * https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc
 */
export const HKO_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';

export type WeatherAnswer = '好天' | '太熱' | '落雨' | '涼爽';

export interface Weather {
  tempC: number;
  rainingMm: number;
  icon: number | null;
  answer: WeatherAnswer;
  emoji: string;
  /** Short text for the UI, e.g. "天文台：29°・有雨". */
  label: string;
  fetchedAt: number;
}

interface HkoCurrent {
  temperature?: { data?: { place?: string; value?: number }[] };
  rainfall?: { data?: { place?: string; max?: number }[] };
  icon?: number[];
}

/** HKO icon codes 62–65 are rain / showers / thunderstorms. */
const RAIN_ICONS = new Set([62, 63, 64, 65]);
const HOT_C = 31;
const COOL_C = 21;

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Pure: turns an HKO payload into the 今日天氣 answer. Throws on payloads without temperatures. */
export function classify(raw: unknown, now = Date.now()): Weather {
  const d = (raw ?? {}) as HkoCurrent;
  const temps = (d.temperature?.data ?? []).map((x) => x.value).filter((v): v is number => typeof v === 'number');
  if (!temps.length) throw new Error('HKO payload has no temperature');
  const hko = d.temperature?.data?.find((x) => x.place === '香港天文台')?.value;
  const tempC = Math.round(typeof hko === 'number' ? hko : median(temps));
  const rain = (d.rainfall?.data ?? []).map((x) => x.max).filter((v): v is number => typeof v === 'number');
  const rainingMm = rain.length ? Math.max(...rain) : 0;
  const icon = Array.isArray(d.icon) && typeof d.icon[0] === 'number' ? d.icon[0] : null;
  const wet = (icon !== null && RAIN_ICONS.has(icon)) || rainingMm >= 1;

  const answer: WeatherAnswer = wet ? '落雨' : tempC >= HOT_C ? '太熱' : tempC <= COOL_C ? '涼爽' : '好天';
  const emoji = { 落雨: '🌧️', 太熱: '🥵', 涼爽: '🍃', 好天: '🌤️' }[answer];
  return { tempC, rainingMm, icon, answer, emoji, label: `天文台：${tempC}°${wet ? '・有雨' : ''}`, fetchedAt: now };
}

let cache: Promise<Weather> | null = null;
let cachedAt = 0;
const TTL = 20 * 60 * 1000;

/** Fetches at most every 20 min; rejects (never throws synchronously) when offline or HKO is down. */
export function getWeather(fetchImpl: typeof fetch = fetch): Promise<Weather> {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  cachedAt = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  cache = fetchImpl(HKO_URL, { signal: ctrl.signal })
    .then((r) => {
      if (!r.ok) throw new Error(`HKO ${r.status}`);
      return r.json();
    })
    .then((j) => classify(j))
    .finally(() => clearTimeout(t));
  cache.catch(() => {
    cache = null;
  });
  return cache;
}
