/** Date-only estimate in the shop's configured India timezone; no delivery SLA implied. */
export function estimatedDelivery(daysValue: unknown, now = new Date()): string {
  const days = Math.min(3650, Math.max(1, Math.trunc(Number(daysValue) || 1)));
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + days));
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}
export function productMoney(value: unknown): string {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
