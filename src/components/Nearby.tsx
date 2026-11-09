import { Icon } from './icons';
import { useState } from 'react';
import { distanceLabel, embedSrc, mapsLink, myLocation, nearby, type LatLon, type Place } from '../services/places';
import { Card } from './ui';

type State =
  | { s: 'idle' }
  | { s: 'loading' }
  | { s: 'ok'; at: LatLon; places: Place[] }
  | { s: 'error'; msg: string };

/** 「附近有咩」: opt-in location → OpenStreetMap places → tap for an embedded map. */
export function Nearby({ option, verb }: { option: string; verb: string }) {
  const [st, setSt] = useState<State>({ s: 'idle' });
  const [open, setOpen] = useState<Place | null>(null);

  const load = async () => {
    setSt({ s: 'loading' });
    try {
      const at = await myLocation();
      const places = await nearby(option, at);
      setSt({ s: 'ok', at, places });
      setOpen(places[0] ?? null);
    } catch (e) {
      const m = (e as Error).message;
      setSt({
        s: 'error',
        msg:
          m === 'denied'
            ? '冇位置權限。可以喺瀏覽器設定開返，或者直接開地圖搜尋。'
            : m === 'unsupported' || m === 'unavailable'
              ? '搵唔到你嘅位置，直接開地圖搜尋啦。'
              : '地圖資料暫時攞唔到（可能網絡慢），直接開地圖搜尋啦。',
      });
    }
  };

  return (
    <Card label={`附近邊度${verb}「${option}」`}>
      {st.s === 'idle' && (
        <>
          <div className="row">
            <button type="button" className="btn2 accent" onClick={() => void load()}>
              <Icon name="pin" size={18} />
              搵附近
            </button>
            <a className="btn2" href={mapsLink(option)} target="_blank" rel="noopener noreferrer">
              開地圖
            </a>
          </div>
        </>
      )}
      {st.s === 'loading' && <div className="empty">搵緊…</div>}
      {st.s === 'error' && (
        <>
          <p className="note" style={{ margin: 0 }}>
            {st.msg}
          </p>
          <a className="btn2" href={mapsLink(option)} target="_blank" rel="noopener noreferrer">
            開地圖搜尋「{option}」
          </a>
        </>
      )}
      {st.s === 'ok' && (
        <>
          {st.places.length === 0 ? (
            <p className="note" style={{ margin: 0 }}>
              附近搵唔到「{option}」
            </p>
          ) : (
            <>
              {open && (
                <iframe
                  className="map-embed"
                  title={`${open.name} 地圖`}
                  src={embedSrc(open.name, open)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
              <div className="list">
                {st.places.map((p) => (
                  <div key={p.id} className="li" aria-current={open?.id === p.id}>
                    <button type="button" className="grow place-btn" onClick={() => setOpen(p)}>
                      {p.name}
                    </button>
                    <span className="meta">{distanceLabel(p.meters)}</span>
                    <a className="pts" href={mapsLink(p.name, p)} target="_blank" rel="noopener noreferrer">
                      導航
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
          <a className="btn2" href={mapsLink(option, st.at)} target="_blank" rel="noopener noreferrer">
            喺地圖睇更多
          </a>
          <p className="note" style={{ margin: 0 }}>
            地點資料 © OpenStreetMap contributors
          </p>
        </>
      )}
    </Card>
  );
}
