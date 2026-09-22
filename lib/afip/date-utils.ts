/**
 * Fechas fiscales AFIP (YYYYMMDD) son días calendario, sin hora.
 * Guardarlas como medianoche UTC y mostrarlas con timeZone UTC evita
 * que en Argentina (UTC-3) se reste un día al vencimiento del CAE.
 */

/** Parsea YYYYMMDD de AFIP a Date (mediodía UTC = día calendario estable). */
export function parseAfipCalendarDate(yyyymmdd: string | number | null | undefined): Date | null {
  if (yyyymmdd == null || yyyymmdd === '') return null;
  const s = String(yyyymmdd).replace(/\D/g, '');
  if (s.length !== 8) return null;
  const y = parseInt(s.substring(0, 4), 10);
  const m = parseInt(s.substring(4, 6), 10);
  const d = parseInt(s.substring(6, 8), 10);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Formatea una fecha calendario fiscal (CAE, vencimientos AFIP) para UI/PDF. */
export function formatAfipCalendarDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Convierte Date calendario a YYYYMMDD para AFIP. */
export function toAfipDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Días restantes hasta una fecha calendario fiscal (sin desfase horario). */
export function daysUntilAfipCalendarDate(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const exp = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(exp.getTime())) return 0;
  const now = new Date();
  const expDay = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((expDay - nowDay) / 86400000);
}
