export const TRADES = [
  "Electrician", "Plumber", "Carpenter", "Welder", "Mason", "Painter",
  "Mechanic", "AC Technician", "Machine Operator", "Driver",
] as const;

export const CITIES = [
  "Vijayawada", "Guntur", "Amaravati", "Visakhapatnam", "Hyderabad", "Bengaluru", "Chennai",
] as const;

export const TOOL_CATEGORIES = ["Power tools", "Welding", "Construction", "HVAC", "Plumbing", "Vehicles", "Hand tools"] as const;

export const JOB_TYPES: Record<string, string> = {
  full_time: "Full time", part_time: "Part time", contract: "Contract", daily: "Daily wage",
};

export const inr = (n?: number | null) =>
  n == null ? "—" : "₹" + n.toLocaleString("en-IN");

export function payRange(min?: number | null, max?: number | null, unit = "day") {
  const u = unit === "month" ? "/month" : unit === "once" ? "" : "/" + unit;
  if (min && max && min !== max) return `${inr(min)}–${inr(max).slice(1)}${u}`;
  return `${inr(min ?? max)}${u}`;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const initials = (name?: string | null) =>
  (name ?? "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
