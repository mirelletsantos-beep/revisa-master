import { addDays, format, isBefore, startOfDay } from 'date-fns';
import { Revision, RevisionType } from './types';

export function calculateRevisionDate(baseDate: Date, type: RevisionType): Date {
  switch (type) {
    case '24h': return addDays(baseDate, 1);
    case '7d': return addDays(baseDate, 7);
    case '15d': return addDays(baseDate, 15);
    case '30d': return addDays(baseDate, 30);
    case '60d': return addDays(baseDate, 60);
    case '120d': return addDays(baseDate, 120);
    case '180d': return addDays(baseDate, 180);
    default: return baseDate;
  }
}

export function isRevisionPending(revision: Revision): boolean {
  if (revision.status === 'Concluída') return false;
  const today = startOfDay(new Date());
  const scheduled = startOfDay(new Date(revision.scheduledDate));
  return isBefore(scheduled, today);
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'Concluída': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'Pendente': return 'text-rose-600 bg-rose-50 border-rose-100';
    case 'Agendada': return 'text-amber-600 bg-amber-50 border-amber-100';
    default: return 'text-slate-600 bg-slate-50 border-slate-100';
  }
}
