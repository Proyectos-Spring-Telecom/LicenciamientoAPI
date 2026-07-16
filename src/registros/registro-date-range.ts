/**
 * Construye límites de rango sobre FechaCreacion sin usar
 * `new Date('YYYY-MM-DD')` (que interpreta UTC y puede cambiar el día).
 *
 * Convención del proyecto: fechas de negocio en calendario America/Mexico_City.
 * Se envían a MySQL como literales `YYYY-MM-DD HH:mm:ss` locales.
 */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarYmd(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = YMD_RE.exec(value);
  if (!match) {
    throw new Error('Formato de fecha inválido.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);

  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    throw new Error('Fecha de calendario inválida.');
  }

  return { year, month, day };
}

/** Inicio inclusivo del día: YYYY-MM-DD 00:00:00 */
export function buildStartDateLocal(fechaInicio: string): string {
  parseCalendarYmd(fechaInicio);
  return `${fechaInicio} 00:00:00`;
}

/**
 * Límite superior exclusivo: día siguiente a fechaFin a las 00:00:00.
 * Incluye todo el día de fechaFin sin depender de milisegundos.
 */
export function buildEndExclusiveDateLocal(fechaFin: string): string {
  const { year, month, day } = parseCalendarYmd(fechaFin);
  const next = new Date(year, month - 1, day + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d} 00:00:00`;
}
