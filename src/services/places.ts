/**
 * Nearby places from OpenStreetMap via the Overpass API (free, no key, CORS enabled).
 * The phone's location is used only for this one request and never stored.
 */
export const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  meters: number;
  kind: string;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** Built-in options → OSM filters. Anything else falls back to a name search. */
const FILTERS: Record<string, { filters: string[]; radius: number }> = {
  日本菜: { filters: ['["amenity"~"restaurant|fast_food"]["cuisine"~"japanese|sushi|ramen|udon|teppanyaki",i]'], radius: 1200 },
  泰國菜: { filters: ['["amenity"="restaurant"]["cuisine"~"thai",i]'], radius: 1500 },
  火鍋: { filters: ['["amenity"="restaurant"]["cuisine"~"hot_?pot|hotpot|shabu",i]', '["amenity"="restaurant"]["name"~"火鍋|打邊爐|鍋"]'], radius: 1500 },
  西餐: { filters: ['["amenity"="restaurant"]["cuisine"~"western|italian|french|steak|american|pizza|burger|spanish",i]'], radius: 1200 },
  麥當勞: { filters: ['["amenity"="fast_food"]["brand"~"McDonald",i]', '["amenity"="fast_food"]["name"~"McDonald|麥當勞",i]'], radius: 2000 },
  咖啡店: { filters: ['["amenity"="cafe"]'], radius: 1000 },
  商場: { filters: ['["shop"="mall"]'], radius: 3000 },
  展覽: { filters: ['["tourism"~"museum|gallery"]', '["amenity"="arts_centre"]'], radius: 5000 },
  海邊: { filters: ['["natural"="beach"]'], radius: 20000 },
  行山: { filters: ['["route"="hiking"]', '["highway"="trailhead"]'], radius: 10000 },
};

/** Drop regex/QL specials from a user-typed name instead of trying to escape them. */
export const esc = (s: string) => s.replace(/[\\"^$.*+?()[\]{}|]/g, '').trim();

/** Pure: Overpass QL for an option around a point. */
export function buildQuery(option: string, at: LatLon): string {
  const f = FILTERS[option] ?? {
    filters: [`["name"~"${esc(option) || "^$"}",i]["amenity"]`, `["name"~"${esc(option) || "^$"}",i]["shop"]`],
    radius: 2000,
  };
  const around = `(around:${f.radius},${at.lat.toFixed(5)},${at.lon.toFixed(5)})`;
  const parts = f.filters.map((x) => `nwr${x}${around};`).join('');
  return `[out:json][timeout:12];(${parts});out center 40;`;
}

export function haversine(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

interface OsmEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Pure: named places, nearest first, Chinese name preferred. */
export function parsePlaces(raw: unknown, at: LatLon, limit = 8): Place[] {
  const els = ((raw as { elements?: OsmEl[] })?.elements ?? []).filter(Boolean);
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const e of els) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    const t = e.tags ?? {};
    const name = t['name:zh'] ?? t['name:zh-Hant'] ?? t.name ?? t['name:en'];
    if (lat === undefined || lon === undefined || !name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      id: `${e.type}/${e.id}`,
      name,
      lat,
      lon,
      meters: haversine(at, { lat, lon }),
      kind: t.cuisine ?? t.amenity ?? t.shop ?? t.tourism ?? t.natural ?? '',
    });
  }
  return out.sort((a, b) => a.meters - b.meters).slice(0, limit);
}

export function distanceLabel(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} 米`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} 公里`;
}

export function myLocation(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e.code === 1 ? 'denied' : 'unavailable')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export async function nearby(option: string, at: LatLon, fetchImpl: typeof fetch = fetch): Promise<Place[]> {
  const body = new URLSearchParams({ data: buildQuery(option, at) });
  let lastErr: unknown;
  for (const url of OVERPASS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetchImpl(url, { method: 'POST', body, signal: ctrl.signal });
      if (!r.ok) throw new Error(`overpass ${r.status}`);
      return parsePlaces(await r.json(), at);
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('overpass failed');
}

export function mapsLink(name: string, p?: LatLon): string {
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  const q = encodeURIComponent(name);
  if (apple) return p ? `https://maps.apple.com/?q=${q}&ll=${p.lat},${p.lon}` : `https://maps.apple.com/?q=${q}`;
  return p
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${p.lat},${p.lon}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Keyless Google Maps embed for a single place. */
export function embedSrc(name: string, p: LatLon): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${p.lat},${p.lon} (${name})`)}&z=16&output=embed`;
}
