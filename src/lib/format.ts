export function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeId(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeId(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function daysRemaining(dueIso: string): number {
  const diff = new Date(dueIso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
