import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  QrCode,
  Award,
  Search,
  Download,
  Edit3,
  Plus,
  Calendar,
  Camera,
  CameraOff,
  ArrowLeft,
  Check,
  X,
  FileSpreadsheet,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  Activity,
  ActivityType,
  AffiliationType,
  EventSettings,
  Participant,
  Speaker,
  ThematicAxis,
} from '../types';
import {
  calculateAttendancePercentage,
  cleanCPF,
  formatCPF,
  generateCertificatePDF,
  isEligibleForCertificate,
} from '../utils/certificatePdf';

interface AdminDashboardProps {
  participants: Participant[];
  activities: Activity[];
  speakers: Speaker[];
  settings: EventSettings;
  onUpdateParticipant: (updated: Participant) => void;
  onAddActivity: (newActivity: Omit<Activity, 'id'>) => void;
  onDeleteActivity: (id: string) => void;
  onAddSpeaker: (newSpeaker: Omit<Speaker, 'id'>) => void;
  onUpdateSettings: (newSettings: EventSettings) => void;
  onBackToPublic: () => void;
}

type AdminTab = 'overview' | 'registrations' | 'attendance' | 'schedule';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  participants,
  activities,
  speakers,
  settings,
  onUpdateParticipant,
  onAddActivity,
  onDeleteActivity,
  onAddSpeaker,
  onUpdateSettings,
  onBackToPublic,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Filtros de Inscrições
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<'TODOS' | 'CONFIRMADO' | 'CANCELADO'>('TODOS');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Filtros e estados de Credenciamento (Frequência)
  const [attSearch, setAttSearch] = useState('');
  const [selectedDayForCheckin, setSelectedDayForCheckin] = useState<1 | 2 | 3>(1);
  const [qrInputCode, setQrInputCode] = useState('');
  const [qrFeedback, setQrFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Formulário de Nova Atividade
  const [newActTitle, setNewActTitle] = useState('');
  const [newActDay, setNewActDay] = useState<1 | 2 | 3>(1);
  const [newActType, setNewActType] = useState<ActivityType>('Oficina');
  const [newActAxis, setNewActAxis] = useState<Exclude<ThematicAxis, 'Todos'>>(
    'Práticas Pedagógicas e Alfabetização'
  );
  const [newActStart, setNewActStart] = useState('14:00');
  const [newActEnd, setNewActEnd] = useState('17:30');
  const [newActLocation, setNewActLocation] = useState('Sala 205 - Bloco B');
  const [newActSpots, setNewActSpots] = useState('30');
  const [newActDescription, setNewActDescription] = useState('');
  const [newActSpeakerId, setNewActSpeakerId] = useState(speakers[0]?.id || 'spk-1');

  // Formulário de Novo Palestrante
  const [newSpkName, setNewSpkName] = useState('');
  const [newSpkTitle, setNewSpkTitle] = useState('');
  const [newSpkInstitution, setNewSpkInstitution] = useState('');
  const [newSpkRole, setNewSpkRole] = useState('Palestrante Convidado');

  // Limpar câmera ao sair da aba
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setQrFeedback({
        type: 'success',
        message: 'Leitor óptico de câmera ativo. Aponte o QR Code do comprovante ou selecione um participante para simular leitura.',
      });
    } catch {
      setQrFeedback({
        type: 'error',
        message: 'Permissão de câmera indisponível no navegador. Utilize o leitor rápido por código/QR abaixo.',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Métricas do Dashboard
  const activeParticipants = participants.filter((p) => p.status === 'CONFIRMADO');
  const checkedInCount = activeParticipants.filter((p) => p.attendedDays.length > 0).length;
  const checkInRate =
    activeParticipants.length > 0
      ? Math.round((checkedInCount / activeParticipants.length) * 100)
      : 0;
  const eligibleCount = activeParticipants.filter(
    (p) => calculateAttendancePercentage(p) >= settings.minAttendancePercent
  ).length;

  const affiliationCounts: Record<AffiliationType, number> = {
    'Estudante de Graduação': activeParticipants.filter(
      (p) => p.affiliation === 'Estudante de Graduação'
    ).length,
    'Pós-graduação': activeParticipants.filter((p) => p.affiliation === 'Pós-graduação').length,
    'Professor/Técnico': activeParticipants.filter((p) => p.affiliation === 'Professor/Técnico')
      .length,
    'Comunidade Externa': activeParticipants.filter((p) => p.affiliation === 'Comunidade Externa')
      .length,
  };

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      'Codigo_Inscricao',
      'Nome_Completo',
      'CPF',
      'Email',
      'Telefone',
      'Vinculo',
      'Instituicao',
      'Status',
      'Dias_Presente',
      'Percentual_Frequencia',
      'Apto_Certificado',
      'Hash_Certificado',
    ];

    const rows = participants.map((p) => {
      const pct = calculateAttendancePercentage(p);
      const apto = pct >= settings.minAttendancePercent && p.status === 'CONFIRMADO' ? 'SIM' : 'NAO';
      return [
        p.registrationCode,
        `"${p.name.replace(/"/g, '""')}"`,
        p.cpf,
        p.email,
        p.phone,
        `"${p.affiliation}"`,
        `"${p.institution.replace(/"/g, '""')}"`,
        p.status,
        `"Dia ${p.attendedDays.join(', ')}"`,
        `${pct}%`,
        apto,
        p.certificateHash,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'inscritos_semana_pedagogia_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle de presença por dia
  const toggleDayAttendance = (participant: Participant, day: 1 | 2 | 3) => {
    const exists = participant.attendedDays.includes(day);
    const updatedDays = exists
      ? participant.attendedDays.filter((d) => d !== day)
      : ([...participant.attendedDays, day].sort() as (1 | 2 | 3)[]);

    onUpdateParticipant({
      ...participant,
      attendedDays: updatedDays,
    });
  };

  // Marcar 100% presença (3 dias)
  const markFullAttendance = (participant: Participant) => {
    onUpdateParticipant({
      ...participant,
      attendedDays: [1, 2, 3],
    });
  };

  // Check-in via QR Code / Código de Inscrição
  const handleQrCodeCheckin = (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const raw = (directCode ?? qrInputCode).trim();
    if (!raw) return;

    let searchCode = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.code) searchCode = parsed.code;
    } catch {
      // string simples
    }

    const cleaned = cleanCPF(searchCode);
    const found = participants.find(
      (p) =>
        p.registrationCode.toLowerCase() === searchCode.toLowerCase() ||
        (cleaned.length === 11 && cleanCPF(p.cpf) === cleaned)
    );

    if (!found) {
      setQrFeedback({
        type: 'error',
        message: `Nenhum inscrito localizado para o código ou CPF "${searchCode}".`,
      });
      return;
    }

    const updatedDays = found.attendedDays.includes(selectedDayForCheckin)
      ? found.attendedDays
      : ([...found.attendedDays, selectedDayForCheckin].sort() as (1 | 2 | 3)[]);

    onUpdateParticipant({
      ...found,
      status: 'CONFIRMADO',
      attendedDays: updatedDays,
    });

    setQrInputCode('');
    setQrFeedback({
      type: 'success',
      message: `Check-in confirmado no Dia ${selectedDayForCheckin} para ${found.name} (${found.registrationCode})! Frequência atualizada: ${Math.round((updatedDays.length / 3) * 100)}%.`,
    });
  };

  const handleSaveEditedParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    onUpdateParticipant({
      ...editingParticipant,
      cpf: formatCPF(editingParticipant.cpf),
    });
    setEditingParticipant(null);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;

    const dateLabels: Record<1 | 2 | 3, string> = {
      1: '24/11 (Terça-feira)',
      2: '25/11 (Quarta-feira)',
      3: '26/11 (Quinta-feira)',
    };

    const isWorkshop = newActType === 'Oficina' || newActType === 'Minicurso';

    onAddActivity({
      day: newActDay,
      dateLabel: dateLabels[newActDay],
      startTime: newActStart,
      endTime: newActEnd,
      title: newActTitle.trim(),
      type: newActType,
      axis: newActAxis,
      location: newActLocation.trim(),
      speakerIds: [newActSpeakerId],
      totalSpots: isWorkshop ? parseInt(newActSpots, 10) || 30 : null,
      hours: 4,
      requiresSpecificEnrollment: isWorkshop,
      description:
        newActDescription.trim() ||
        'Atividade integrante da grade oficial da XII Semana Acadêmica de Pedagogia.',
    });

    setNewActTitle('');
    setNewActDescription('');
  };

  const handleCreateSpeaker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpkName.trim() || !newSpkInstitution.trim()) return;

    const parts = newSpkName
      .replace(/Prof\.|Profa\.|Dr\.|Dra\.|Me\.|Ma\./gi, '')
      .trim()
      .split(' ')
      .filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : newSpkName.slice(0, 2).toUpperCase();

    onAddSpeaker({
      name: newSpkName.trim(),
      initials,
      role: newSpkRole.trim(),
      title: newSpkTitle.trim() || 'Doutor(a) em Educação',
      institution: newSpkInstitution.trim(),
      bio: 'Docente e pesquisador(a) convidado(a) da Semana Acadêmica de Pedagogia.',
    });

    setNewSpkName('');
    setNewSpkTitle('');
    setNewSpkInstitution('');
  };

  const filteredRegistrations = participants.filter((p) => {
    const matchesStatus = regStatusFilter === 'TODOS' || p.status === regStatusFilter;
    const q = regSearch.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.cpf.includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.registrationCode.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredAttendanceList = participants.filter((p) => {
    if (p.status === 'CANCELADO') return false;
    const q = attSearch.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.cpf.includes(q) ||
      p.registrationCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Top Bar Administrativo */}
      <header className="bg-[#1E293B] border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToPublic}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar à Página Pública
            </button>
            <div>
              <h1 className="text-lg font-bold text-white font-display">
                Painel Administrativo · Organização Semana de Pedagogia
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  certificatesReleased: !settings.certificatesReleased,
                })
              }
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                settings.certificatesReleased
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              }`}
            >
              {settings.certificatesReleased
                ? 'Certificados Liberados em Lote (Ativo)'
                : 'Liberar Certificados em Lote'}
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Inscritos (CSV)
            </button>
          </div>
        </div>
      </header>

      {/* Sub-navegação do Painel Administrativo */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#00A8E8] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            1. Dashboard Resumido
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'registrations'
                ? 'bg-[#00A8E8] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            2. Controle de Inscrições ({participants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-[#00A8E8] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            3. Credenciamento & Leitor QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-[#00A8E8] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            4. Gestão de Programação & Certificados
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        {/* ABA 1: DASHBOARD RESUMIDO */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 4 KPIs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-xl bg-[#1E293B] border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Total de Inscritos Confirmados</span>
                  <Users className="w-4 h-4 text-[#00A8E8]" />
                </div>
                <p className="text-3xl font-bold text-white font-mono tabular-nums">
                  {activeParticipants.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {participants.length} registros totais no banco
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1E293B] border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Taxa de Credenciamento / Presença</span>
                  <QrCode className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-emerald-400 font-mono tabular-nums">
                  {checkInRate}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {checkedInCount} participantes com check-in registrado
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1E293B] border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Aptos ao Certificado (≥ {settings.minAttendancePercent}%)</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-white font-mono tabular-nums">
                  {eligibleCount}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Status do lote:{' '}
                  <span className={settings.certificatesReleased ? 'text-emerald-400' : 'text-amber-400'}>
                    {settings.certificatesReleased ? 'Liberado' : 'Bloqueado'}
                  </span>
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1E293B] border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Atividades & Oficinas Ativas</span>
                  <Calendar className="w-4 h-4 text-[#00A8E8]" />
                </div>
                <p className="text-3xl font-bold text-white font-mono tabular-nums">
                  {activities.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Carga horária oficial: {settings.totalHours}h
                </p>
              </div>
            </div>

            {/* Inscritos por Categoria e Vagas Restantes nas Oficinas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inscritos por Categoria */}
              <div className="lg:col-span-5 rounded-xl bg-[#1E293B] border border-slate-800 p-6">
                <h2 className="text-base font-bold text-white font-display mb-4">
                  Inscritos por Categoria de Vínculo
                </h2>
                <div className="space-y-4">
                  {(Object.keys(affiliationCounts) as AffiliationType[]).map((aff) => {
                    const count = affiliationCounts[aff];
                    const pct =
                      activeParticipants.length > 0
                        ? Math.round((count / activeParticipants.length) * 100)
                        : 0;
                    return (
                      <div key={aff} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200 font-medium">{aff}</span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#0F172A] overflow-hidden">
                          <div
                            className="h-full bg-[#00A8E8]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vagas Restantes nas Oficinas e Minicursos */}
              <div className="lg:col-span-7 rounded-xl bg-[#1E293B] border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white font-display">
                    Ocupação e Vagas Restantes nas Oficinas / Minicursos
                  </h2>
                  <span className="text-xs text-slate-400">Tempo real</span>
                </div>
                <div className="space-y-3.5">
                  {activities
                    .filter((a) => a.requiresSpecificEnrollment)
                    .map((workshop) => {
                      const enrolled = activeParticipants.filter((p) =>
                        p.enrolledActivityIds.includes(workshop.id)
                      ).length;
                      const total = workshop.totalSpots || 30;
                      const remaining = Math.max(0, total - enrolled);
                      const occupancyPct = Math.min(100, Math.round((enrolled / total) * 100));

                      return (
                        <div
                          key={workshop.id}
                          className="p-3.5 rounded-lg bg-[#0F172A] border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {workshop.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Dia {workshop.day} · {workshop.startTime}–{workshop.endTime} ·{' '}
                                {workshop.location}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                                {remaining} vagas restantes
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400 tabular-nums">
                                {enrolled}/{total} inscritos ({occupancyPct}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: CONTROLE DE INSCRIÇÕES */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Pesquisar por nome, CPF, e-mail ou código de inscrição..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                {(['TODOS', 'CONFIRMADO', 'CANCELADO'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRegStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      regStatusFilter === status
                        ? 'bg-[#00A8E8] text-white'
                        : 'bg-[#0F172A] text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal/Card de Edição Manual do Participante */}
            {editingParticipant && (
              <form
                onSubmit={handleSaveEditedParticipant}
                className="p-5 rounded-xl bg-[#1E293B] border border-[#00A8E8] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-display">
                    Edição Manual de Dados para Certificado ({editingParticipant.registrationCode})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingParticipant(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome Completo (Certificado)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingParticipant.name}
                      onChange={(e) =>
                        setEditingParticipant({ ...editingParticipant, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CPF</label>
                    <input
                      type="text"
                      required
                      value={editingParticipant.cpf}
                      onChange={(e) =>
                        setEditingParticipant({
                          ...editingParticipant,
                          cpf: formatCPF(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                    <input
                      type="email"
                      required
                      value={editingParticipant.email}
                      onChange={(e) =>
                        setEditingParticipant({ ...editingParticipant, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Status da Inscrição</label>
                    <select
                      value={editingParticipant.status}
                      onChange={(e) =>
                        setEditingParticipant({
                          ...editingParticipant,
                          status: e.target.value as Participant['status'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    >
                      <option value="CONFIRMADO">CONFIRMADO</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingParticipant(null)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#00A8E8] text-xs font-semibold text-white"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}

            {/* Tabela de Inscritos */}
            <div className="rounded-xl bg-[#1E293B] border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0F172A]/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Participante</th>
                      <th className="py-3.5 px-4">CPF</th>
                      <th className="py-3.5 px-4">Vínculo / Instituição</th>
                      <th className="py-3.5 px-4 text-right">Frequência</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-sm">
                    {filteredRegistrations.map((p) => {
                      const pct = calculateAttendancePercentage(p);
                      const eligible = isEligibleForCertificate(p, settings);
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-[#00A8E8] tabular-nums whitespace-nowrap">
                            {p.registrationCode}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.email}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                            {p.cpf}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-slate-200">{p.affiliation}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[220px]">
                              {p.institution}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                            <span
                              className={
                                pct >= settings.minAttendancePercent
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-amber-400'
                              }
                            >
                              {pct}%
                            </span>{' '}
                            <span className="text-slate-500">({p.attendedDays.length}/3d)</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span
                              className={
                                p.status === 'CONFIRMADO'
                                  ? 'text-emerald-400 font-medium'
                                  : 'text-red-400 font-medium'
                              }
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingParticipant(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Editar Nome / Dados para Certificado"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {eligible && (
                                <button
                                  type="button"
                                  onClick={() => generateCertificatePDF(p, settings, activities)}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 transition-colors"
                                  title="Emitir Certificado PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateParticipant({
                                    ...p,
                                    status:
                                      p.status === 'CONFIRMADO' ? 'CANCELADO' : 'CONFIRMADO',
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                              >
                                {p.status === 'CONFIRMADO' ? 'Cancelar' : 'Reativar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CONTROLE DE FREQUÊNCIA (CREDENCIAMENTO & LEITOR QR CODE) */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda (5 cols): Leitor de QR Code (Câmera + Simulador Instantâneo) */}
            <div className="lg:col-span-5 rounded-xl bg-[#1E293B] border border-slate-800 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-5 h-5 text-[#00A8E8]" />
                  <h2 className="text-base font-bold text-white font-display">
                    Leitor de QR Code (Recepção / Auditório)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    cameraActive
                      ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                      : 'bg-[#00A8E8] text-white hover:bg-[#0284C7]'
                  }`}
                >
                  {cameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5" />
                      Desativar Câmera
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      Abrir Câmera QR
                    </>
                  )}
                </button>
              </div>

              {/* Seletor do Dia para Credenciamento */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Dia Ativo para Registro de Entrada:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDayForCheckin(day)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        selectedDayForCheckin === day
                          ? 'bg-[#00A8E8]/20 border-[#00A8E8] text-white'
                          : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Dia {day} ({day === 1 ? '24/11' : day === 2 ? '25/11' : '26/11'})
                    </button>
                  ))}
                </div>
              </div>

              {/* Visor de Câmera */}
              {cameraActive && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-8 border-2 border-dashed border-[#00A8E8]/80 rounded-lg pointer-events-none flex items-end justify-center p-2">
                    <span className="text-[11px] bg-slate-950/80 text-slate-200 px-2 py-0.5 rounded">
                      Posicione o QR Code do participante no quadro
                    </span>
                  </div>
                </div>
              )}

              {/* Entrada direta por Código do QR ou Simulador de Leitura Óptica */}
              <form onSubmit={(e) => handleQrCodeCheckin(e)} className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Leitura por Scanner USB / Código do QR Code ou CPF:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInputCode}
                    onChange={(e) => setQrInputCode(e.target.value)}
                    placeholder="Ex: SAP2026-1124 ou CPF..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-[#00A8E8]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Registrar Presença
                  </button>
                </div>
              </form>

              {/* Simulador de Bip de QR Code em 1 clique para teste imediato */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <p className="text-xs text-slate-400">
                  Simular leitura óptica de QR Code na porta do auditório:
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeParticipants.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQrCodeCheckin(undefined, p.registrationCode)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono tabular-nums transition-colors"
                    >
                      Bipar QR: {p.name.split(' ')[0]} ({p.registrationCode})
                    </button>
                  ))}
                </div>
              </div>

              {qrFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs ${
                    qrFeedback.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                      : 'bg-red-950/50 border-red-700/60 text-red-200'
                  }`}
                >
                  {qrFeedback.message}
                </div>
              )}
            </div>

            {/* Coluna Direita (7 cols): Lista de Chamada Digital com Toggle Presente/Ausente */}
            <div className="lg:col-span-7 rounded-xl bg-[#1E293B] border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white font-display">
                    Lista de Chamada Digital & Cálculo Automático de Frequência
                  </h2>
                  <p className="text-xs text-slate-400">
                    Marque a presença por dia de evento. Participantes com ≥{' '}
                    {settings.minAttendancePercent}% liberam automaticamente o download do certificado.
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  placeholder="Busca rápida por nome, CPF ou código na fila de credenciamento..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00A8E8]"
                />
              </div>

              <div className="divide-y divide-slate-800">
                {filteredAttendanceList.map((p) => {
                  const pct = calculateAttendancePercentage(p);
                  const isEligible = pct >= settings.minAttendancePercent;
                  return (
                    <div
                      key={p.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{p.name}</span>
                          <span className="font-mono text-xs text-[#00A8E8] tabular-nums">
                            {p.registrationCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                          CPF: {p.cpf} · {p.affiliation}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {([1, 2, 3] as const).map((day) => {
                          const isPresent = p.attendedDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDayAttendance(p, day)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                isPresent
                                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                  : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {isPresent ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              Dia {day}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => markFullAttendance(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                          title="Confirmar 100% de presença nos 3 dias"
                        >
                          100%
                        </button>

                        <div className="w-16 text-right">
                          <span
                            className={`font-mono text-xs font-bold tabular-nums ${
                              isEligible ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: GESTÃO DE PROGRAMAÇÃO, PALESTRANTES E LIBERAÇÃO DE CERTIFICADOS */}
        {activeTab === 'schedule' && (
          <div className="space-y-8">
            {/* Controle de Liberação em Lote de Certificados */}
            <div className="p-6 rounded-xl bg-[#1E293B] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#00A8E8]">
                  Configuração de Pós-Evento & Certificação
                </span>
                <h2 className="text-lg font-bold text-white font-display">
                  Liberação em Lote dos Certificados ({settings.totalHours} horas)
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Quando ativado, todos os participantes com status CONFIRMADO e frequência igual ou superior a{' '}
                  <strong className="text-slate-200">{settings.minAttendancePercent}%</strong> podem emitir o PDF autenticado diretamente na página pública.
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      certificatesReleased: !settings.certificatesReleased,
                    })
                  }
                  className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    settings.certificatesReleased
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {settings.certificatesReleased
                    ? 'Lote de Certificados: LIBERADO'
                    : 'Lote de Certificados: BLOQUEADO'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Formulário de Nova Atividade */}
              <form
                onSubmit={handleCreateActivity}
                className="lg:col-span-6 rounded-xl bg-[#1E293B] border border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#00A8E8]" />
                  <h3 className="text-base font-bold text-white font-display">
                    Cadastrar Nova Atividade / Oficina na Programação
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Título da Palestra, Mesa ou Oficina *
                    </label>
                    <input
                      type="text"
                      required
                      value={newActTitle}
                      onChange={(e) => setNewActTitle(e.target.value)}
                      placeholder="Ex: Oficina 03: Jogos Pedagógicos e Alfabetização Matemática"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dia do Evento</label>
                    <select
                      value={newActDay}
                      onChange={(e) => setNewActDay(Number(e.target.value) as 1 | 2 | 3)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    >
                      <option value={1}>Dia 1 (24/11)</option>
                      <option value={2}>Dia 2 (25/11)</option>
                      <option value={3}>Dia 3 (26/11)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Modalidade / Tipo</label>
                    <select
                      value={newActType}
                      onChange={(e) => setNewActType(e.target.value as ActivityType)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    >
                      <option value="Palestra">Palestra</option>
                      <option value="Mesa-redonda">Mesa-redonda</option>
                      <option value="Oficina">Oficina (Com limite de vagas)</option>
                      <option value="Minicurso">Minicurso (Com limite de vagas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Horário Início</label>
                    <input
                      type="text"
                      value={newActStart}
                      onChange={(e) => setNewActStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Horário Término</label>
                    <input
                      type="text"
                      value={newActEnd}
                      onChange={(e) => setNewActEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Local / Sala</label>
                    <input
                      type="text"
                      value={newActLocation}
                      onChange={(e) => setNewActLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Vagas (Para Oficinas/Minicursos)
                    </label>
                    <input
                      type="number"
                      value={newActSpots}
                      onChange={(e) => setNewActSpots(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Eixo Temático</label>
                    <select
                      value={newActAxis}
                      onChange={(e) =>
                        setNewActAxis(e.target.value as Exclude<ThematicAxis, 'Todos'>)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    >
                      <option value="Práticas Pedagógicas e Alfabetização">
                        Práticas Pedagógicas e Alfabetização
                      </option>
                      <option value="Educação Inclusiva e Direitos Humanos">
                        Educação Inclusiva e Direitos Humanos
                      </option>
                      <option value="Tecnologias e Inovação na Educação">
                        Tecnologias e Inovação na Educação
                      </option>
                      <option value="Gestão Democrática e Políticas Públicas">
                        Gestão Democrática e Políticas Públicas
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Docente / Palestrante Responsável
                    </label>
                    <select
                      value={newActSpeakerId}
                      onChange={(e) => setNewActSpeakerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    >
                      {speakers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.institution})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-white text-xs font-semibold transition-colors"
                >
                  Adicionar Atividade à Grade Oficial
                </button>
              </form>

              {/* Formulário de Novo Convidado / Palestrante */}
              <form
                onSubmit={handleCreateSpeaker}
                className="lg:col-span-6 rounded-xl bg-[#1E293B] border border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white font-display">
                    Cadastrar Convidado / Palestrante
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome Completo com Titulação *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSpkName}
                      onChange={(e) => setNewSpkName(e.target.value)}
                      placeholder="Ex: Profa. Dra. Maria Teresa Eglér Mantoan"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Papel no Evento</label>
                      <input
                        type="text"
                        value={newSpkRole}
                        onChange={(e) => setNewSpkRole(e.target.value)}
                        placeholder="Ex: Palestrante"
                        className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Titulação Acadêmica</label>
                      <input
                        type="text"
                        value={newSpkTitle}
                        onChange={(e) => setNewSpkTitle(e.target.value)}
                        placeholder="Ex: Doutora em Educação"
                        className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Instituição de Origem *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSpkInstitution}
                      onChange={(e) => setNewSpkInstitution(e.target.value)}
                      placeholder="Ex: Faculdade de Educação - UNICAMP"
                      className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-sm text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Adicionar Palestrante ao Evento
                </button>

                {/* Lista resumida de atividades cadastradas */}
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-xs font-semibold text-slate-300 mb-2">
                    Atividades Ativas na Programação ({activities.length})
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0F172A] border border-slate-800 text-xs"
                      >
                        <div className="truncate">
                          <span className="text-[#00A8E8] font-mono mr-2">
                            Dia {act.day} ({act.startTime})
                          </span>
                          <span className="text-slate-200 font-medium">{act.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteActivity(act.id)}
                          className="text-slate-500 hover:text-red-400 p-1 shrink-0"
                          title="Remover atividade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
