import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  X,
  UserCheck,
  AlertCircle,
  Printer,
  Copy,
  Check,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import { Activity, AffiliationType, EventSettings, Participant } from '../types';
import { cleanCPF, formatCPF, formatPhone } from '../utils/certificatePdf';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  participants: Participant[];
  settings: EventSettings;
  preselectedActivityId?: string | null;
  onRegister: (newParticipant: Omit<Participant, 'id' | 'registrationCode' | 'certificateHash' | 'createdAt' | 'status' | 'attendedDays' | 'attendedActivityIds'>) => Participant;
}

const AFFILIATION_OPTIONS: AffiliationType[] = [
  'Estudante de Graduação',
  'Pós-graduação',
  'Professor/Técnico',
  'Comunidade Externa',
];

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  activities,
  participants,
  settings,
  preselectedActivityId,
  onRegister,
}) => {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [affiliation, setAffiliation] = useState<AffiliationType>('Estudante de Graduação');
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>(
    preselectedActivityId ? [preselectedActivityId] : []
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdParticipant, setCreatedParticipant] = useState<Participant | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  React.useEffect(() => {
    if (preselectedActivityId && !selectedWorkshops.includes(preselectedActivityId)) {
      setSelectedWorkshops((prev) => [...prev, preselectedActivityId]);
    }
  }, [preselectedActivityId]);

  if (!isOpen) return null;

  const workshopActivities = activities.filter((a) => a.requiresSpecificEnrollment);

  const getEnrolledCount = (activityId: string) => {
    return participants.filter(
      (p) => p.status !== 'CANCELADO' && p.enrolledActivityIds.includes(activityId)
    ).length;
  };

  const toggleWorkshop = (activityId: string, remainingSpots: number) => {
    if (selectedWorkshops.includes(activityId)) {
      setSelectedWorkshops((prev) => prev.filter((id) => id !== activityId));
    } else {
      if (remainingSpots <= 0) return;
      setSelectedWorkshops((prev) => [...prev, activityId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanedCpf = cleanCPF(cpf);
    if (name.trim().split(' ').length < 2) {
      setErrorMessage('Informe seu nome e sobrenome completos (exatamente como sairá no certificado).');
      return;
    }
    if (cleanedCpf.length !== 11) {
      setErrorMessage('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Informe um endereço de e-mail institucional ou pessoal válido.');
      return;
    }
    if (!institution.trim()) {
      setErrorMessage('Informe sua instituição de ensino, rede de educação ou organização.');
      return;
    }

    // Prevenção de Duplicidade (CPF ou E-mail)
    const duplicateCpf = participants.find(
      (p) => cleanCPF(p.cpf) === cleanedCpf && p.status !== 'CANCELADO'
    );
    if (duplicateCpf) {
      setErrorMessage(
        `Já existe uma inscrição ativa vinculada ao CPF ${cpf} (${duplicateCpf.registrationCode}). Utilize a Área do Participante para consultar seu comprovante.`
      );
      return;
    }

    const duplicateEmail = participants.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.status !== 'CANCELADO'
    );
    if (duplicateEmail) {
      setErrorMessage(
        `Já existe uma inscrição ativa vinculada ao e-mail ${email.trim()}. Utilize a Área do Participante para consultar sua inscrição.`
      );
      return;
    }

    const registered = onRegister({
      name: name.trim(),
      cpf: formatCPF(cpf),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || '(11) 90000-0000',
      institution: institution.trim(),
      affiliation,
      enrolledActivityIds: selectedWorkshops,
    });

    setCreatedParticipant(registered);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetAndClose = () => {
    setName('');
    setCpf('');
    setEmail('');
    setPhone('');
    setInstitution('');
    setSelectedWorkshops([]);
    setErrorMessage(null);
    setCreatedParticipant(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl bg-[#1E293B] border border-slate-700/80 text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F172A] border-b border-slate-800">
          <div>
            <span className="text-xs font-medium text-[#00A8E8] tracking-wide">
              {settings.editionLabel} · Inscrição Oficial Gratuita
            </span>
            <h2 className="text-lg font-bold text-white font-display">
              {createdParticipant
                ? 'Comprovante Oficial de Inscrição'
                : 'Formulário de Inscrição no Evento'}
            </h2>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdParticipant ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-950/50 border border-emerald-700/50 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-white">
                  Inscrição confirmada com sucesso!
                </p>
                <p className="text-emerald-300/90 mt-0.5">
                  Apresente o QR Code abaixo na recepção do auditório ou salas de oficina para credenciamento instantâneo.
                </p>
              </div>
            </div>

            {/* Ticket Card */}
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="text-xs text-slate-400">
                  <span>{createdParticipant.affiliation}</span>
                  <span className="mx-2">·</span>
                  <span className="text-emerald-400 font-medium">STATUS: CONFIRMADO</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Participante (Nome para Certificado)</p>
                  <p className="text-xl font-bold text-white font-display">
                    {createdParticipant.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">CPF</p>
                    <p className="font-mono text-slate-200 tabular-nums">
                      {createdParticipant.cpf}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Código de Credenciamento</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#00A8E8] tabular-nums">
                        {createdParticipant.registrationCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(createdParticipant.registrationCode)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copiar código"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Instituição / Curso</p>
                  <p className="text-sm text-slate-300">{createdParticipant.institution}</p>
                </div>
                {createdParticipant.enrolledActivityIds.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <p className="text-xs text-slate-400 mb-1">
                      Oficinas e Minicursos Selecionados ({createdParticipant.enrolledActivityIds.length}):
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {createdParticipant.enrolledActivityIds.map((actId) => {
                        const act = activities.find((a) => a.id === actId);
                        return act ? (
                          <li key={act.id} className="text-slate-300">
                            • {act.title} ({act.startTime} - {act.location})
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* QR Code Box */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shrink-0">
                <QRCodeSVG
                  value={JSON.stringify({
                    code: createdParticipant.registrationCode,
                    cpf: createdParticipant.cpf,
                    name: createdParticipant.name,
                  })}
                  size={140}
                  level="M"
                />
                <span className="mt-2 font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {createdParticipant.registrationCode}
                </span>
                <span className="text-[10px] text-slate-500">Check-in Digital Even3</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir Comprovante
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-sm font-semibold text-white transition-colors"
              >
                Concluir e Voltar ao Evento
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/60 border border-red-700/60 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome Completo (exatamente como sairá no Certificado) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Eduarda Silva Oliveira"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  CPF (Validação única de certificado) *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm font-mono tabular-nums focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm font-mono tabular-nums focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail Principal *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@instituicao.edu.br"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Vínculo *
                </label>
                <select
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value as AffiliationType)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white text-sm focus:outline-none focus:border-[#00A8E8]"
                >
                  {AFFILIATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Instituição / Curso ou Rede de Ensino *
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: Faculdade de Educação USP - Licenciatura em Pedagogia"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A8E8]"
                />
              </div>
            </div>

            {/* Seleção Opcional de Minicursos e Oficinas com Controle de Vagas */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-200">
                  Seleção Opcional de Oficinas e Minicursos (Com Controle de Vagas)
                </label>
                <span className="text-xs text-slate-400">
                  Palestras e mesas-redondas já inclusas
                </span>
              </div>
              <div className="space-y-2.5">
                {workshopActivities.map((workshop) => {
                  const enrolled = getEnrolledCount(workshop.id);
                  const total = workshop.totalSpots || 30;
                  const remaining = Math.max(0, total - enrolled);
                  const isSelected = selectedWorkshops.includes(workshop.id);
                  const isFull = remaining === 0 && !isSelected;

                  return (
                    <div
                      key={workshop.id}
                      onClick={() => !isFull && toggleWorkshop(workshop.id, remaining)}
                      className={`p-3.5 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#00A8E8]/15 border-[#00A8E8] text-white'
                          : isFull
                          ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                          : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFull}
                            onChange={() => {}}
                            className="mt-1 rounded border-slate-600 text-[#00A8E8] focus:ring-[#00A8E8]"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">
                              {workshop.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Dia {workshop.day} ({workshop.dateLabel})
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="w-3.5 h-3.5" />
                                {workshop.startTime}–{workshop.endTime}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {workshop.location}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-mono tabular-nums shrink-0 ${
                            remaining === 0
                              ? 'text-red-400 font-semibold'
                              : remaining <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {remaining === 0 ? 'Esgotado' : `${remaining}/${total} vagas`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-sm font-semibold text-white transition-colors shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                Confirmar Inscrição Gratuita
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
