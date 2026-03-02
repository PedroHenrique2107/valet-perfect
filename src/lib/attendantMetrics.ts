import type { Attendant, AttendantStatus } from "@/types/valet";

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return hours * 60 + minutes;
}

export function formatMinutesHuman(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function getWorkedMinutes(attendant: Attendant, nowMs: number = Date.now()): number {
  if (!attendant.startedAt || !attendant.isOnline) {
    return attendant.accumulatedWorkMinutes;
  }
  const liveMinutes = Math.max(
    0,
    Math.floor((nowMs - attendant.startedAt.getTime()) / 60000),
  );
  return attendant.accumulatedWorkMinutes + liveMinutes;
}

export function getWorkLimitMinutes(attendant: Attendant): number {
  return Math.max(1, attendant.maxWorkHours) * 60;
}

export function getWorkloadLevel(attendant: Attendant, nowMs: number = Date.now()): "normal" | "warning" | "exceeded" {
  const worked = getWorkedMinutes(attendant, nowMs);
  const limit = getWorkLimitMinutes(attendant);
  if (worked > limit) return "exceeded";
  if (worked >= Math.round(limit * 0.8)) return "warning";
  return "normal";
}

export function getStatusLabel(status: AttendantStatus): string {
  const statusMap: Record<AttendantStatus, string> = {
    online: "Online",
    offline: "Offline",
    lunch: "Almoco",
    dinner: "Janta",
    commuting: "Deslocamento",
  };
  return statusMap[status];
}

export function getPerformanceLabel(attendant: Attendant): "Alta" | "Media" | "Baixa" {
  let score = 0;
  if (attendant.rating >= 4.7) score += 1;
  if (attendant.avgServiceTime > 0 && attendant.avgServiceTime <= 100) score += 1;
  if (attendant.vehiclesHandledToday >= 20) score += 1;
  if (score >= 3) return "Alta";
  if (score === 2) return "Media";
  return "Baixa";
}
