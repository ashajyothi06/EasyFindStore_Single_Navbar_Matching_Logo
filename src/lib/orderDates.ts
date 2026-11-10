export const statusText = (status: unknown) => String(status || "-").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
export const dateKey = (raw?: string | null) => {
  if (!raw) return "";
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00+05:30` : raw);
  return Number.isNaN(d.valueOf()) ? "" : new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit"}).format(d);
};
export const todayIST = () => dateKey(new Date().toISOString());
export const readableDate = (value?:string|null) => {
  if (!value) return "Not yet scheduled";
  const d = new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value);
  return Number.isNaN(d.valueOf()) ? value : new Intl.DateTimeFormat("en-IN", {timeZone:"Asia/Kolkata", weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(d);
};
export const dayDiff = (value?:string|null) => {
  const key = dateKey(value), today = todayIST();
  if (!key || !today) return null;
  return Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`))/86400000);
};
export const dueLabel = (eta?:string|null, status?:string) => {
 if (status === "delivered") return "Delivered";
 if (status === "cancelled") return "Cancelled";
 const days = dayDiff(eta);
 if (days === null) return "Date pending";
 if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
 if (days === 0) return "Due today";
 if (days === 1) return "Due tomorrow";
 return `Due in ${days} days`;
};
