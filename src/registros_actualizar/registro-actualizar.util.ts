/**
 * Helpers de actualización parcial (solo valores útiles).
 * Conserva 0 como valor válido.
 */

export function tieneValorActualizable(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }
  return true;
}

export function hasUsefulValues(
  value: Record<string, unknown> | object | undefined | null,
): boolean {
  if (!value) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).some((item) => {
    if (Array.isArray(item)) {
      return item.some((el) =>
        typeof el === 'object' && el !== null
          ? hasUsefulValues(el)
          : tieneValorActualizable(el),
      );
    }
    if (typeof item === 'object' && item !== null) {
      return hasUsefulValues(item);
    }
    return tieneValorActualizable(item);
  });
}

/** Asigna a la entidad solo claves con valor útil (mapeo entityKey → valor). */
export function assignUseful(
  target: object,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (tieneValorActualizable(value)) {
      Object.assign(target, { [key]: value });
    }
  }
}

/** Asigna solo campos de la lista blanca con valor útil (nombres del DTO). */
export function assignUsefulFields<T extends object, D extends object>(
  target: T,
  source: D,
  fields: readonly (keyof D)[],
  mapKey?: (field: keyof D) => string,
): void {
  for (const field of fields) {
    const value = source[field];
    if (!tieneValorActualizable(value)) {
      continue;
    }
    const key = mapKey ? mapKey(field) : (field as string);
    (target as Record<string, unknown>)[key] = value;
  }
}
