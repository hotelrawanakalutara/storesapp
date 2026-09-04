/** Display-only unit scaling: values stored in g/ml show as kg/L once they reach 1000, for readability. */

const SCALE_UP: Record<string, string> = { g: "kg", ml: "L" };

/** The unit to display a value in, based on the item's stored unit and a reference quantity (usually current balance). */
export function getDisplayUnit(storedUnit: string, referenceValue: number): string {
  const scaled = SCALE_UP[storedUnit];
  return scaled && Math.abs(referenceValue) >= 1000 ? scaled : storedUnit;
}

/** Rounds to 2 decimal places, clearing floating-point noise like 60971.465000000004. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Converts a value from the item's stored unit into the given display unit, always rounded to 2dp. */
export function toDisplayValue(value: number, storedUnit: string, displayUnit: string): number {
  if (storedUnit === displayUnit) return round2(value);
  return round2(value / 1000);
}
