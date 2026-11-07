export interface Slice {
  start: number; // degrees, clockwise from 12 o'clock
  end: number;
}

/** Slice sizes are the probabilities, so what you see is what you get. */
export function slicesFor(probabilities: number[]): Slice[] {
  const total = probabilities.reduce((s, p) => s + p, 0);
  let acc = 0;
  return probabilities.map((p) => {
    const start = acc;
    acc += total > 0 ? (p / total) * 360 : 0;
    return { start, end: acc };
  });
}

/**
 * Rotation (degrees, clockwise) that brings a point inside the winning slice under the
 * top pointer, after at least `turns` full spins from `current`.
 * `rand` picks where inside the slice it lands (kept away from the edges so it's unambiguous).
 */
export function targetRotation(
  current: number,
  slice: Slice,
  rand: () => number = Math.random,
  turns = 5,
): number {
  const width = slice.end - slice.start;
  const margin = Math.min(width * 0.15, 4);
  const landAt = slice.start + margin + rand() * Math.max(0, width - 2 * margin);
  // The pointer is at 0°. A wheel rotated by R shows angle (360 - R mod 360) under it.
  const want = (360 - landAt) % 360;
  const curMod = ((current % 360) + 360) % 360;
  const delta = (want - curMod + 360) % 360;
  return current + turns * 360 + delta;
}

/** Which slice sits under the pointer for a given rotation (used to verify the spin in tests). */
export function sliceUnderPointer(rotation: number, slices: Slice[]): number {
  const a = (((360 - rotation) % 360) + 360) % 360;
  return slices.findIndex((s) => a >= s.start && a < s.end);
}

export function arcPath(cx: number, cy: number, r: number, slice: Slice): string {
  const sweep = slice.end - slice.start;
  if (sweep >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const p = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [x1, y1] = p(slice.start);
  const [x2, y2] = p(slice.end);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}
