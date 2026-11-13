/** Pure numeric helpers; safe to import during a build or in the browser. */
export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);
