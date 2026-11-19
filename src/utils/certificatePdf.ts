import jsPDF from 'jspdf';
import { Activity, EventSettings, Participant } from '../types';

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function cleanCPF(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Calcula o percentual de presença do participante combinando os 3 dias do evento.
 * Também permite cálculo por atividades assistidas.
 */
export function calculateAttendancePercentage(participant: Participant): number {
  const daysPercent = Math.round((participant.attendedDays.length / 3) * 100);
  return Math.min(100, daysPercent);
}

export function isEligibleForCertificate(
  participant: Participant,
  settings: EventSettings
): boolean {
  if (participant.status !== 'CONFIRMADO') return false;
  if (!settings.certificatesReleased) return false;
  const percent = calculateAttendancePercentage(participant);
  return percent >= settings.minAttendancePercent;
}

export function generateCertificatePDF(
  participant: Participant,
  settings: EventSettings,
  activities: Activity[]
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth(); // 297
  const height = doc.internal.pageSize.getHeight(); // 210

  // Fundo escuro elegante inspirado na identidade Even3/Acadêmica
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, width, height, 'F');

  // Moldura interna creme/branca para alta legibilidade na impressão
  doc.setFillColor(252, 252, 250);
  doc.roundedRect(12, 12, width - 24, height - 24, 3, 3, 'F');

  // Filete duplo institucional (Azul Even3 #00A8E8 e Âmbar #F59E0B)
  doc.setDrawColor(0, 168, 232);
  doc.setLineWidth(1.2);
  doc.roundedRect(16, 16, width - 32, height - 32, 2, 2, 'S');

  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(18, 18, width - 36, height - 36, 1.5, 1.5, 'S');

  // Cabeçalho Institucional
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(settings.institutionName.toUpperCase(), width / 2, 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(settings.departmentName, width / 2, 38, { align: 'center' });

  // Título Principal do Certificado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICADO DE PARTICIPAÇÃO', width / 2, 55, { align: 'center' });

  // Linha divisória sutil
  doc.setDrawColor(0, 168, 232);
  doc.setLineWidth(0.8);
  doc.line(width / 2 - 35, 60, width / 2 + 35, 60);

  // Corpo do texto declaratório
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text('Certificamos para os devidos fins acadêmicos e científicos que', width / 2, 74, {
    align: 'center',
  });

  // Nome do Participante em Destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(2, 132, 199);
  doc.text(participant.name.toUpperCase(), width / 2, 87, { align: 'center' });

  // Texto detalhado com CPF, Vínculo, Evento, Data e Carga Horária
  const attendancePct = calculateAttendancePercentage(participant);
  const enrolledWorkshops = activities
    .filter((a) => participant.enrolledActivityIds.includes(a.id))
    .map((a) => a.title)
    .join('; ');

  const bodyParagraph = `portador(a) do CPF nº ${participant.cpf}, na qualidade de ${participant.affiliation} (${participant.institution}), participou integralmente da "${settings.eventTitle}", realizada no período de ${settings.dateRange}, na modalidade ${settings.modality}, cumprindo carga horária total de ${settings.totalHours} (${settings.totalHours === 30 ? 'trinta' : settings.totalHours}) horas-aula com frequência comprovada de ${attendancePct}%.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  const splitText = doc.splitTextToSize(bodyParagraph, width - 70);
  doc.text(splitText, width / 2, 100, { align: 'center', lineHeightFactor: 1.45 });

  // Oficinas/Minicursos integrados no currículo do evento
  if (enrolledWorkshops) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const workshopText = doc.splitTextToSize(
      `Atividades práticas e oficinas integradas concluídas: ${enrolledWorkshops}.`,
      width - 80
    );
    doc.text(workshopText, width / 2, 126, { align: 'center' });
  }

  // Local e Data de Emissão
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text('São Paulo, 26 de novembro de 2026.', width / 2, 143, { align: 'center' });

  // Assinaturas
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(50, 165, 130, 165);
  doc.line(width - 130, 165, width - 50, 165);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Profa. Dra. Helena Vasconcelos', 90, 171, { align: 'center' });
  doc.text('Prof. Dr. Marcos Vinícius Ribeiro', width - 90, 171, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Coordenação Geral da XII Semana de Pedagogia', 90, 176, { align: 'center' });
  doc.text('Comissão Científica e Certificação Acadêmica', width - 90, 176, { align: 'center' });

  // Rodapé de Autenticidade (Hash + Código de Inscrição)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(24, 182, width - 48, 12, 1.5, 1.5, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `CÓDIGO DE AUTENTICIDADE: ${participant.certificateHash}   |   INSCRIÇÃO: ${participant.registrationCode}   |   VALIDAÇÃO PÚBLICA NO PORTAL DO EVENTO`,
    width / 2,
    189.5,
    { align: 'center' }
  );

  const safeFileName = participant.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_');

  doc.save(`certificado_pedagogia_${safeFileName}.pdf`);
}
