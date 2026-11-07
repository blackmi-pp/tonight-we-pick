import { useCallback, useEffect, useState } from 'react';
import { suggestFilms, type Film, type FilmKind } from '../services/films';
import { COLORS, Card } from './ui';

/** Three suggestions from iTunes for 電影／劇集／紀錄片, filtered by tonight's mood and time. */
export function FilmSuggest({
  kind,
  mood,
  maxMinutes,
  onSave,
  saved,
}: {
  kind: FilmKind;
  mood?: string;
  maxMinutes?: number;
  onSave: (title: string) => void;
  saved: string[];
}) {
  const [films, setFilms] = useState<Film[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    setFilms(null);
    setErr(false);
    suggestFilms(kind, mood, maxMinutes)
      .then(setFilms)
      .catch(() => setErr(true));
  }, [kind, mood, maxMinutes]);

  useEffect(load, [load]);

  return (
    <Card label={`今晚可以${kind === 'movie' ? '睇呢幾套' : '追呢幾套'}`} shadow={COLORS.teal}>
      {mood && <p className="note" style={{ margin: 0 }}>按「{mood}」揀</p>}
      {err && <p className="note" style={{ margin: 0 }}>暫時攞唔到建議（可能網絡慢）。</p>}
      {!films && !err && <div className="empty">揾緊……</div>}
      {films && films.length === 0 && <p className="note">今次搵唔到合適嘅，再試一次？</p>}
      {films?.map((f) => (
        <div key={f.id} className="film">
          {f.poster ? <img src={f.poster} alt="" loading="lazy" width={72} height={108} /> : <div className="poster-ph">🎬</div>}
          <div className="film-info">
            <b>{f.title}</b>
            <span className="note">
              {[f.year, f.genre, f.minutes ? `${f.minutes} 分鐘` : ''].filter(Boolean).join('・')}
            </span>
            {f.blurb && <span className="blurb">{f.blurb}</span>}
            <div className="row" style={{ marginTop: 4 }}>
              <button type="button" className="btn2 sm" disabled={saved.includes(f.title)} onClick={() => onSave(f.title)}>
                {saved.includes(f.title) ? '✓ 喺片單' : '＋ 片單'}
              </button>
              {f.url && (
                <a className="btn2 sm" href={f.url} target="_blank" rel="noopener noreferrer">
                  詳情
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn2" onClick={load}>
        🔄 換一批
      </button>
      <p className="note" style={{ margin: 0 }}>資料來自 Apple iTunes</p>
    </Card>
  );
}
