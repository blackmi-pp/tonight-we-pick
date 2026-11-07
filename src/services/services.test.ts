import { describe, expect, it, vi } from 'vitest';
import { bestOf, rpsWinner, stopWinner, tapWinner } from '../engine/games';
import { buildUrl, parseFilms, pickSome } from './films';
import { buildQuery, distanceLabel, esc, haversine, nearby, parsePlaces } from './places';
import { classify } from './weather';

describe('HKO weather', () => {
  const payload = (temps: number[], rain: number[] = [0], icon = 50) => ({
    temperature: { data: temps.map((value, i) => ({ place: i === 0 ? '京士柏' : `p${i}`, value })) },
    rainfall: { data: rain.map((max) => ({ place: 'x', max })) },
    icon: [icon],
  });

  it('maps temperature and rain to the 今日天氣 answers', () => {
    expect(classify(payload([27, 28, 26])).answer).toBe('好天');
    expect(classify(payload([33, 32])).answer).toBe('太熱');
    expect(classify(payload([18, 19])).answer).toBe('涼爽');
    expect(classify(payload([27], [0], 63)).answer).toBe('落雨');
    expect(classify(payload([27], [0, 4])).answer).toBe('落雨');
  });

  it('prefers the 香港天文台 station reading', () => {
    const p = payload([20, 30]);
    p.temperature.data[1]!.place = '香港天文台';
    expect(classify(p).tempC).toBe(30);
  });

  it('rejects junk', () => {
    expect(() => classify({})).toThrow();
    expect(() => classify(null)).toThrow();
  });
});

describe('places (OpenStreetMap)', () => {
  const at = { lat: 22.2819, lon: 114.1582 };

  it('builds a cuisine query for built-in options and a name query otherwise', () => {
    expect(buildQuery('日本菜', at)).toContain('japanese');
    expect(buildQuery('日本菜', at)).toContain('around:1200,22.28190,114.15820');
    const own = buildQuery('樓下(茶記)', at);
    expect(own).toContain('"name"~"樓下茶記"');
    expect(esc('a"b\\c.*')).toBe('abc');
  });

  it('parses, names in Chinese first, de-dupes and sorts by distance', () => {
    const raw = {
      elements: [
        { type: 'node', id: 1, lat: 22.29, lon: 114.16, tags: { name: 'Far', 'name:zh': '遠啲' } },
        { type: 'way', id: 2, center: { lat: 22.282, lon: 114.1583 }, tags: { name: 'Near' } },
        { type: 'node', id: 3, lat: 22.282, lon: 114.1583, tags: { name: 'Near' } },
        { type: 'node', id: 4, lat: 22.282, lon: 114.1583, tags: {} },
      ],
    };
    const ps = parsePlaces(raw, at);
    expect(ps.map((p) => p.name)).toEqual(['Near', '遠啲']);
    expect(ps[0]!.meters).toBeLessThan(50);
  });

  it('haversine and labels', () => {
    expect(haversine(at, { lat: 22.2909, lon: 114.1582 })).toBeGreaterThan(990);
    expect(haversine(at, { lat: 22.2909, lon: 114.1582 })).toBeLessThan(1010);
    expect(distanceLabel(234)).toBe('230 米');
    expect(distanceLabel(1530)).toBe('1.5 公里');
  });

  it('falls back to the second Overpass server', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ elements: [{ type: 'node', id: 1, lat: 22.282, lon: 114.158, tags: { name: 'X' } }] }) });
    const ps = await nearby('咖啡店', at, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(2);
    expect(ps[0]!.name).toBe('X');
  });
});

describe('films (iTunes)', () => {
  it('builds a genre search for Hong Kong', () => {
    const u = new URL(buildUrl('movie', 'Comedy'));
    expect(u.searchParams.get('country')).toBe('hk');
    expect(u.searchParams.get('attribute')).toBe('genreTerm');
    expect(u.searchParams.get('media')).toBe('movie');
  });

  it('parses, de-dupes, strips HTML and sorts newest first', () => {
    const films = parseFilms({
      results: [
        { trackId: 1, trackName: 'Old', releaseDate: '1999-01-01', artworkUrl100: 'x/100x100bb.jpg', longDescription: '<b>hi</b>' },
        { trackId: 2, trackName: 'New', releaseDate: '2025-05-01', trackTimeMillis: 6_000_000 },
        { trackId: 3, trackName: 'New' },
        { trackName: 'no id' },
      ],
    });
    expect(films.map((f) => f.title)).toEqual(['New', 'Old']);
    expect(films[0]!.minutes).toBe(100);
    expect(films[1]!.poster).toBe('x/300x300bb.jpg');
    expect(films[1]!.blurb).toBe('hi');
    expect(parseFilms(null)).toEqual([]);
  });

  it('pickSome returns n distinct items', () => {
    const got = pickSome([1, 2, 3, 4, 5, 6, 7, 8], 3, () => 0.5);
    expect(new Set(got).size).toBe(3);
  });
});

describe('mini-games', () => {
  it('包剪揼 rules', () => {
    expect(rpsWinner('rock', 'scissors')).toBe('A');
    expect(rpsWinner('rock', 'paper')).toBe('B');
    expect(rpsWinner('paper', 'paper')).toBeNull();
    expect(bestOf(['A', null, 'B'])).toBeNull();
    expect(bestOf(['A', null, 'A'])).toBe('A');
  });
  it('停錶 and 撳快啲', () => {
    expect(stopWinner(4900, 5200)).toBe('A');
    expect(stopWinner(5100, 4900)).toBeNull();
    expect(tapWinner(30, 31)).toBe('B');
  });
});
