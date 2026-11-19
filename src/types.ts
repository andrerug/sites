export type ActivityType = 'Palestra' | 'Mesa-redonda' | 'Oficina' | 'Minicurso' | 'Credenciamento';

export type AffiliationType =
  | 'Estudante de Graduação'
  | 'Pós-graduação'
  | 'Professor/Técnico'
  | 'Comunidade Externa';

export type ThematicAxis =
  | 'Todos'
  | 'Práticas Pedagógicas e Alfabetização'
  | 'Educação Inclusiva e Direitos Humanos'
  | 'Tecnologias e Inovação na Educação'
  | 'Gestão Democrática e Políticas Públicas';

export interface Speaker {
  id: string;
  name: string;
  initials: string;
  role: string;
  title: string;
  institution: string;
  bio: string;
  avatarUrl?: string;
}

export interface Activity {
  id: string;
  day: 1 | 2 | 3;
  dateLabel: string;
  startTime: string;
  endTime: string;
  title: string;
  type: ActivityType;
  axis: Exclude<ThematicAxis, 'Todos'>;
  location: string;
  speakerIds: string[];
  totalSpots: number | null; // null = auditório principal sem limite restrito de oficina
  hours: number;
  requiresSpecificEnrollment: boolean;
  description: string;
}

export interface Participant {
  id: string;
  name: string;
  cpf: string; // Formato 000.000.000-00
  email: string;
  phone: string;
  institution: string;
  affiliation: AffiliationType;
  registrationCode: string; // Ex: SAP2026-8492
  certificateHash: string; // Ex: CERT-SAP-2026-9A8F-3C1D
  createdAt: string;
  status: 'CONFIRMADO' | 'CANCELADO' | 'PENDENTE';
  enrolledActivityIds: string[]; // Oficinas/minicursos escolhidos
  attendedDays: (1 | 2 | 3)[]; // Presença geral por dia
  attendedActivityIds: string[]; // Presença específica por atividade/oficina
}

export interface EventSettings {
  eventTitle: string;
  eventSubtitle: string;
  editionLabel: string;
  categoryLabel: string;
  totalHours: number;
  modality: string;
  dateRange: string;
  institutionName: string;
  departmentName: string;
  certificatesReleased: boolean;
  minAttendancePercent: number;
}
