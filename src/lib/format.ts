export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatTimeBR(value: Date): string {
  return value.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeBR(value: Date): string {
  return `${value.toLocaleDateString("pt-BR")} ${formatTimeBR(value)}`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}min`;
}

export function formatDurationFromDate(entryTime: Date): string {
  const diffMs = Date.now() - entryTime.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  return formatDurationMinutes(totalMinutes);
}

export function formatDurationPrecise(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
