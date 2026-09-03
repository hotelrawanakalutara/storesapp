export const UNIT_OPTIONS = ["g", "kg", "ml", "L", "pcs", "btl", "packet"] as const;

const ALTERNATE_UNIT: Record<string, string> = { g: "kg", kg: "g", ml: "L", L: "ml" };

const CONVERSION_FACTOR: Record<string, Record<string, number>> = {
  g: { kg: 1000 },
  kg: { g: 1 / 1000 },
  ml: { L: 1000 },
  L: { ml: 1 / 1000 },
};

/** For a weight/volume unit, the other unit in its pair (g<->kg, ml<->L). Null for count units (pcs, btl, packet). */
export function getAlternateUnit(baseUnit: string): string | null {
  return ALTERNATE_UNIT[baseUnit] ?? null;
}

/** Converts a quantity entered in `enteredUnit` into the item's `baseUnit`, e.g. 2 kg entered against a 'g' item -> 2000. */
export function convertToBaseUnit(quantity: number, enteredUnit: string, baseUnit: string): number {
  if (enteredUnit === baseUnit) return quantity;
  const factor = CONVERSION_FACTOR[baseUnit]?.[enteredUnit];
  return factor ? quantity * factor : quantity;
}
