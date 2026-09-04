/** Display-only unit scaling: values stored in g/ml show as kg/L once they reach 1000, for readability. */

const SCALE_UP: Record<string, string> = { g: "kg", ml: "L" };

/** The unit to display a value in, based on the item's stored unit and a reference quantity (usually current balance). */
export function getDisplayUnit(storedUnit: string, referenceValue: number): string {
  const scaled = SCALE_UP[storedUnit];
  return scaled && Math.abs(referenceValue) >= 1000 ? scaled : storedUnit;
}

/** Converts a value from the item's stored unit into the given display unit. */
export function toDisplayValue(value: number, storedUnit: string, displayUnit: string): number {
  if (storedUnit === displayUnit) return value;
  const rounded = Math.round((value / 1000) * 100) / 100;
  return rounded;
}
