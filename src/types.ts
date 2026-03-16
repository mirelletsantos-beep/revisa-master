export type Area = 'Linguagens' | 'Matemática' | 'Ciências da Natureza' | 'Ciências Humanas' | 'Redação';

export type RevisionType = '24h' | '7d' | '15d' | '30d' | '60d' | '120d' | '180d';
export type RevisionStatus = 'Agendada' | 'Pendente' | 'Concluída';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
}

export interface Study {
  id?: string;
  userId: string;
  area: Area;
  subject: string;
  topic: string;
  description?: string;
  pdfUrl?: string;
  pdfName?: string;
  createdAt: string;
}

export interface Revision {
  id?: string;
  userId: string;
  studyId: string;
  type: RevisionType;
  scheduledDate: string; // ISO string
  originalScheduledDate: string; // ISO string
  completedDate?: string; // ISO string
  status: RevisionStatus;
  subject: string;
  topic: string;
  area: Area;
  studyDate: string; // ISO string
}
