const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Dates are formatted by hand rather than through `toLocaleDateString`.
 * Node resolves an undefined locale differently from the browser, so the same
 * timestamp rendered on the server and then hydrated on the client produced
 * "Oct 2, 2026" against "2 Oct 2026" and React reported a mismatch.
 */
function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2 Oct 2026" */
export function formatDay(iso: string | null | undefined): string | null {
  const date = parse(iso);
  if (!date) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2 Oct 2026, 13:28" */
export function formatDayTime(iso: string | null | undefined): string | null {
  const date = parse(iso);
  if (!date) return null;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDay(iso)}, ${hours}:${minutes}`;
}
