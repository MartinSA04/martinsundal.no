/**
 * Frontmatter dates are plain calendar days, which is all anyone authoring an
 * entry knows and all a reader ever sees. Google's structured-data validation
 * wants more than that: a bare `YYYY-MM-DD` in a date-valued field is reported
 * as a datetime with no timezone, and Googlebot then reads it in whatever zone
 * it happens to be crawling from. So the calendar day is widened here, in one
 * place, into the full ISO 8601 instant the JSON-LD emits.
 *
 * Only the JSON-LD needs this. Sitemap `lastmod` takes W3C Datetime, for which
 * a bare date is a complete value, so /sitemap.xml keeps the authored form.
 */

const ZONE = "Europe/Oslo";

const zoneName = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  timeZoneName: "longOffset",
});

/**
 * Oslo's UTC offset on a given day, asked of the runtime rather than written
 * down: the site straddles +01:00 and +02:00 and the changeover moves yearly.
 */
function offsetOn(date: string): string {
  const parts = zoneName.formatToParts(new Date(`${date}T12:00:00Z`));
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  // "GMT+02:00" -> "+02:00". A bare "GMT" is never Oslo, but cover it anyway.
  return zone.slice(3) || "Z";
}

/**
 * `2026-07-28` -> `2026-07-28T12:00:00+02:00`.
 *
 * Midday, not midnight: midnight in Oslo is still the previous day in UTC, so
 * anything normalising to UTC — which is most things — would read every date
 * on the site one day early.
 */
export function isoDateTime(date: string): string {
  // Project dates come through the Zod schema, but the work page's video meta
  // is hand-written; a wrong shape here would concatenate into markup that
  // parses as nothing. Fail the build instead.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`expected a YYYY-MM-DD calendar day, got "${date}"`);
  }
  return `${date}T12:00:00${offsetOn(date)}`;
}
