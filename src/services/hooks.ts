import { useEffect, useState } from 'react';
import { getWeather, type Weather } from './weather';

/** HKO weather; null while loading or when offline (the UI just hides it). */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    let alive = true;
    getWeather()
      .then((x) => alive && setW(x))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return w;
}
