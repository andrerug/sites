import React, { useState, useEffect } from 'react';
import {
  Globe,
  Award,
  Wifi,
  CreditCard,
  Play,
  Check,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  QrCode,
  BookOpen,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  Activity,
  EventSettings,
  Participant,
  Speaker,
  ThematicAxis,
} from './types';
import {
  HERO_BANNER_URL,
  INITIAL_ACTIVITIES,
  INITIAL_PARTICIPANTS,
  INITIAL_SETTINGS,
  INITIAL_SPEAKERS,
} from './data/initialData';
import { RegistrationModal } from './components/RegistrationModal';
import { CertificatePortal } from './components/CertificatePortal';
import { AdminDashboard } from './components/AdminDashboard';

const STORAGE_KEYS = {
  PARTICIPANTS: 'sap_even3_participants_v1',
  ACTIVITIES: 'sap_even3_activities_v1',
  SPEAKERS: 'sap_even3_speakers_v1',
  SETTINGS: 'sap_even3_settings_v1',
};

const THEMATIC_AXES: ThematicAxis[] = [
  'Todos',
  'Práticas Pedagógicas e Alfabetização',
  'Educação Inclusiva e Direitos Humanos',
  'Tecnologias e Inovação na Educação',
  'Gestão Democrática e Políticas Públicas',
];

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
    return saved ? JSON.parse(saved) : INITIAL_PARTICIPANTS;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [speakers, setSpeakers] = useState<Speaker[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPEAKERS);
    return saved ? JSON.parse(saved) : INITIAL_SPEAKERS;
  });

  const [settings, setSettings] = useState<EventSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Navegação Público vs Admin (/admin)
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#/admin'
      ? 'admin'
      : 'public';
  });

  // Modal de Inscrição
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [preselectedWorkshopId, setPreselectedWorkshopId] = useState<string | null>(null);

  // Filtros de Programação
  const [selectedDay, setSelectedDay] = useState<1 | 2 | 3>(1);
  const [selectedAxis, setSelectedAxis] = useState<ThematicAxis>('Todos');

  // Validação de Certificado no Rodapé
  const [footerHashInput, setFooterHashInput] = useState('');
  const [activeValidationHash, setActiveValidationHash] = useState('');

  // Persistência automática em LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(speakers));
  }, [speakers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const handleOpenRegistration = (workshopId?: string) => {
    setPreselectedWorkshopId(workshopId || null);
    setIsRegModalOpen(true);
  };

  const handleRegisterParticipant = (
    data: Omit<
      Participant,
      | 'id'
      | 'registrationCode'
      | 'certificateHash'
      | 'createdAt'
      | 'status'
      | 'attendedDays'
      | 'attendedActivityIds'
    >
  ): Participant => {
    const randomNum = Math.floor(1400 + Math.random() * 8500);
    const hexPart1 = Math.random().toString(16).substring(2, 6).toUpperCase();
    const hexPart2 = Math.random().toString(16).substring(2, 6).toUpperCase();

    const newParticipant: Participant = {
      ...data,
      id: `part-${Date.now()}`,
      registrationCode: `SAP2026-${randomNum}`,
      certificateHash: `CERT-SAP26-${hexPart1}-${hexPart2}`,
      createdAt: new Date().toISOString(),
      status: 'CONFIRMADO',
      // Para facilitar o teste imediato após inscrição, inicia com presença confirmada no Dia 1
      attendedDays: [1],
      attendedActivityIds: ['act-1', ...data.enrolledActivityIds],
    };

    setParticipants((prev) => [newParticipant, ...prev]);
    return newParticipant;
  };

  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAddActivity = (newAct: Omit<Activity, 'id'>) => {
    const created: Activity = {
      ...newAct,
      id: `act-${Date.now()}`,
    };
    setActivities((prev) => [...prev, created]);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddSpeaker = (newSpk: Omit<Speaker, 'id'>) => {
    const created: Speaker = {
      ...newSpk,
      id: `spk-${Date.now()}`,
    };
    setSpeakers((prev) => [...prev, created]);
  };

  const handleFooterHashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerHashInput.trim()) return;
    setActiveValidationHash(footerHashInput.trim());
    const certSection = document.getElementById('certificados');
    if (certSection) {
      certSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (viewMode === 'admin') {
    return (
      <AdminDashboard
        participants={participants}
        activities={activities}
        speakers={speakers}
        settings={settings}
        onUpdateParticipant={handleUpdateParticipant}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
        onAddSpeaker={handleAddSpeaker}
        onUpdateSettings={setSettings}
        onBackToPublic={() => setViewMode('public')}
      />
    );
  }

  const activeRegistrationsCount =
    2530 + participants.filter((p) => p.status === 'CONFIRMADO').length;

  const filteredActivities = activities.filter((act) => {
    const matchesDay = act.day === selectedDay;
    const matchesAxis = selectedAxis === 'Todos' || act.axis === selectedAxis;
    return matchesDay && matchesAxis;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Top Bar Contract (3 zones separated by gap-8) */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#topo"
            className="text-lg font-extrabold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            Even3 <span className="font-normal text-slate-300">Pedagogia</span>
          </a>

          {/* Zone 2: 4–5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a
              href="#programacao"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Programação
            </a>
            <a
              href="#convidados"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Convidados
            </a>
            <a
              href="#sobre"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sobre o Evento
            </a>
            <a
              href="#certificados"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Certificados
            </a>
            <button
              type="button"
              onClick={() => setViewMode('admin')}
              className="hover:text-[#00A8E8] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Painel Admin
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenRegistration()}
              className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-slate-950 font-bold text-xs tracking-wide transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              Inscrever-se Grátis
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Estilo Even3 Reference PDF) */}
      <section id="topo" className="pt-8 pb-14 bg-[#0F172A] border-b border-slate-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <a
              href="#programacao"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00A8E8] hover:underline"
            >
              <span>‹ Todos os conteúdos da Semana Acadêmica</span>
            </a>
            <button
              type="button"
              onClick={() => setViewMode('admin')}
              className="md:hidden inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
            >
              <Lock className="w-3.5 h-3.5" />
              Painel Admin
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Coluna Esquerda (7 cols): Categoria, Título, 4 Indicadores e Cards de Ação Even3 */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Linha de metadados superior inspirada na referência */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-amber-400">
                    {settings.categoryLabel} • 100% Gratuito
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {activeRegistrationsCount} inscritos
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">{settings.dateRange}</span>
                </div>

                <h1
                  className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {settings.eventTitle}
                </h1>

                {/* Strip de 4 atributos estilo Even3 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 pb-1">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-slate-400">Certificado de</p>
                      <p className="font-bold text-white font-mono tabular-nums">
                        {settings.totalHours}h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-slate-400">Certificado</p>
                      <p className="font-bold text-white">Even3 / FEUSP</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Wifi className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-slate-400">Modalidade</p>
                      <p className="font-bold text-white">{settings.modality}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-slate-400">Inscrição</p>
                      <p className="font-bold text-emerald-400">100% Gratuita</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dois Cards Empilhados de CTA (Exatamente como no layout Even3 de referência) */}
              <div className="space-y-3 pt-2">
                {/* Card Principal: Inscrever-se Gratuitamente */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#1E293B] border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-200">
                      Participação completa com{' '}
                      <strong className="text-white">
                        certificado de {settings.totalHours} horas
                      </strong>{' '}
                      + credencial QR Code
                    </p>
                    <p className="text-lg font-extrabold text-white font-display mt-0.5">
                      Grátis <span className="text-xs font-normal text-emerald-400 ml-1">• Vagas Abertas</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenRegistration()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Inscrever-se Gratuitamente
                  </button>
                </div>

                {/* Card Secundário: Emitir Certificado / Consultar Inscrição */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#1E293B]/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Já realizou sua inscrição ou participou das atividades?
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      Emissão de Certificado Digital e 2ª Via de QR Code
                    </p>
                  </div>
                  <a
                    href="#certificados"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
                  >
                    <Award className="w-4 h-4" />
                    Emitir Certificado
                  </a>
                </div>
              </div>
            </div>

            {/* Coluna Direita (5 cols): Banner Visual do Evento */}
            <div className="lg:col-span-5 flex">
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl flex flex-col justify-end min-h-[280px]">
                <img
                  src={HERO_BANNER_URL}
                  alt="Banner Oficial da XII Semana Acadêmica de Pedagogia"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent flex flex-col justify-end p-5">
                  <span className="text-xs font-mono text-amber-400">
                    {settings.institutionName}
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    Auditório Paulo Freire & Laboratórios Didáticos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: PROGRAMAÇÃO COMPLETA (Abas por Dia + Filtro de Eixo Temático + Inscrição em Oficinas) */}
      <section id="programacao" className="py-16 bg-[#0F172A] border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-[#00A8E8] tracking-wide mb-2">
                01. Grade Científica e Prática
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                Programação Completa
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Selecione o dia e o eixo temático para consultar horários, locais e vagas disponíveis nas oficinas práticas.
              </p>
            </div>

            {/* Abas de Dias (Segmented Control) */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1E293B] border border-slate-800 self-start">
              {([1, 2, 3] as const).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selectedDay === day
                      ? 'bg-[#00A8E8] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Dia {day} · {day === 1 ? '24/11' : day === 2 ? '25/11' : '26/11'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por Eixo Temático */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {THEMATIC_AXES.map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => setSelectedAxis(axis)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  selectedAxis === axis
                    ? 'bg-slate-100 text-slate-950 border-slate-100 font-semibold'
                    : 'bg-[#1E293B] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {axis}
              </button>
            ))}
          </div>

          {/* Lista de Atividades do Dia */}
          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#1E293B] border border-slate-800 text-center space-y-2">
                <p className="text-sm text-slate-300 font-medium">
                  Nenhuma atividade encontrada neste dia para o eixo temático selecionado.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedAxis('Todos')}
                  className="text-xs text-[#00A8E8] hover:underline"
                >
                  Limpar filtro de eixo temático
                </button>
              </div>
            ) : (
              filteredActivities.map((act) => {
                const enrolledCount = participants.filter(
                  (p) => p.status !== 'CANCELADO' && p.enrolledActivityIds.includes(act.id)
                ).length;
                const totalSpots = act.totalSpots;
                const remainingSpots =
                  totalSpots !== null ? Math.max(0, totalSpots - enrolledCount) : null;
                const actSpeakers = speakers.filter((s) => act.speakerIds.includes(s.id));

                return (
                  <div
                    key={act.id}
                    className="p-6 rounded-xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-2.5 flex-1">
                      {/* Metadados limpos com separadores tipográficos */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono font-semibold text-[#00A8E8] tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {act.startTime} – {act.endTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-400">{act.type}</span>
                        <span aria-hidden="true">·</span>
                        <span>{act.axis}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{act.hours}h</span>
                      </div>

                      <h3 className="text-lg font-bold text-white font-display">
                        {act.title}
                      </h3>

                      <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                        {act.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {act.location}
                        </span>
                        {actSpeakers.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {actSpeakers.map((s) => s.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vagas e Ação de Inscrição na Oficina */}
                    <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800 shrink-0">
                      {remainingSpots !== null ? (
                        <div className="text-left lg:text-right">
                          <span
                            className={`font-mono text-xs font-bold tabular-nums ${
                              remainingSpots === 0
                                ? 'text-red-400'
                                : remainingSpots <= 8
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {remainingSpots === 0
                              ? 'Vagas Esgotadas'
                              : `${remainingSpots} de ${totalSpots} vagas disponíveis`}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            Requer seleção na inscrição
                          </span>
                        </div>
                      ) : (
                        <div className="text-left lg:text-right">
                          <span className="text-xs font-medium text-emerald-400">
                            Acesso Livre aos Inscritos
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            Auditório Principal
                          </span>
                        </div>
                      )}

                      {act.requiresSpecificEnrollment ? (
                        <button
                          type="button"
                          disabled={remainingSpots === 0}
                          onClick={() => handleOpenRegistration(act.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            remainingSpots === 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-[#00A8E8] hover:bg-[#0284C7] text-white'
                          }`}
                        >
                          <span>Inscrever-se nesta Oficina</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRegistration()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>Garantir Credencial</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: CONVIDADOS E PALESTRANTES (Estilo Cards Even3 da Referência) */}
      <section id="convidados" className="py-16 bg-[#0F172A] border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold text-[#00A8E8] tracking-wide mb-2">
              02. Corpo Docente e Pesquisadores Convidados
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Convidados
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className="flex items-stretch rounded-xl bg-[#1E293B] border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors"
              >
                {/* Bloco Esquerdo: Foto ou Monograma com Gradiente Azul Even3 */}
                <div className="w-28 sm:w-32 shrink-0 bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0F172A] flex items-center justify-center relative overflow-hidden">
                  {speaker.avatarUrl ? (
                    <img
                      src={speaker.avatarUrl}
                      alt={speaker.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white/95 font-display tracking-tight">
                      {speaker.initials}
                    </span>
                  )}
                </div>

                {/* Bloco Direito: Papel, Nome Sublinhado Azul, Titulação e Instituição */}
                <div className="p-4 sm:p-5 flex flex-col justify-center space-y-1.5 flex-1">
                  <div className="text-xs font-semibold text-amber-400">
                    {speaker.role}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#38BDF8] underline underline-offset-4 font-display">
                    {speaker.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-200">
                    {speaker.title} · <span className="text-slate-400">{speaker.institution}</span>
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2 pt-0.5">
                    {speaker.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: SOBRE O EVENTO & BENEFÍCIOS (Layout 2 Colunas idêntico ao PDF Even3) */}
      <section id="sobre" className="py-16 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Sobre o Evento (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold text-[#00A8E8] tracking-wide">
                03. Apresentação Institucional
              </p>
              <h2 className="text-2xl font-bold text-white font-display">
                Sobre o evento
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                <p>
                  A <strong>{settings.eventTitle}</strong>, vinculada ao curso de Licenciatura em Pedagogia e ao Programa de Pós-Graduação em Educação da{' '}
                  <strong>{settings.institutionName}</strong>, reúne estudantes de graduação, pós-graduandos, professores da educação básica, gestores escolares e movimentos sociais em três dias de formação crítica e compartilhamento de experiências.
                </p>
                <p>
                  O encontro contará com conferência de abertura, mesas-redondas interinstitucionais, oficinas pedagógicas com limite de vagas para vivência prática em laboratório e grupos de trabalho divididos a partir de quatro eixos temáticos estruturantes: Alfabetização e Práticas Pedagógicas, Educação Inclusiva e Direitos Humanos, Cultura Digital na Escola Pública e Gestão Democrática.
                </p>
                <p className="text-xs text-slate-400 pt-2">
                  A participação em todas as atividades e a emissão do certificado oficial de {settings.totalHours} horas são 100% gratuitas para toda a comunidade acadêmica e educadores da rede pública.
                </p>
              </div>
            </div>

            {/* Benefícios e Informações Gerais (5 cols - Tabela com bordas e checks verdes como na referência) */}
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold text-emerald-400 tracking-wide">
                Garantias ao Congressista
              </p>
              <h2 className="text-2xl font-bold text-white font-display">
                Benefícios
              </h2>

              <div className="rounded-xl bg-[#1E293B]/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-400">
                    Certificado digital validado de {settings.totalHours} horas (MEC/FEUSP)
                  </span>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-400">
                    Credenciamento rápido via QR Code no smartphone
                  </span>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-400">
                    Acesso aos anais, caderno de textos e materiais complementares
                  </span>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-emerald-400">
                    Inscrição gratuita em oficinas práticas e minicursos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: ÁREA DO PARTICIPANTE / EMISSÃO E VALIDAÇÃO DE CERTIFICADOS */}
      <CertificatePortal
        participants={participants}
        activities={activities}
        settings={settings}
        initialValidationCode={activeValidationHash}
      />

      {/* RODAPÉ AZUL INSTITUCIONAL (Inspirado na Página 2 do PDF Even3) */}
      <footer className="bg-[#1D8FE1] text-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-white/20">
            {/* Coluna 1: Instituição & Comissão Organizadora */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-2xl font-extrabold tracking-tight font-display">
                Even3 <span className="font-normal text-sky-100">Acadêmico</span>
              </div>
              <p className="text-xs text-sky-100 leading-relaxed">
                {settings.institutionName}
                <br />
                {settings.departmentName}
                <br />
                Av. da Universidade, 308 - Cidade Universitária, São Paulo - SP
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('admin')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Acessar Painel da Comissão (/admin)
                </button>
              </div>
            </div>

            {/* Coluna 2: Links Rápidos do Evento */}
            <div className="lg:col-span-2 space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-sky-100 mb-3">
                O Evento
              </p>
              <ul className="space-y-2 text-white/90">
                <li>
                  <a href="#sobre" className="hover:underline">
                    Sobre a XII Semana
                  </a>
                </li>
                <li>
                  <a href="#programacao" className="hover:underline">
                    Programação Oficial
                  </a>
                </li>
                <li>
                  <a href="#convidados" className="hover:underline">
                    Convidados & Docentes
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenRegistration()}
                    className="hover:underline text-left"
                  >
                    Inscrição Online
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Soluções Pós-evento */}
            <div className="lg:col-span-2 space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-sky-100 mb-3">
                Participante
              </p>
              <ul className="space-y-2 text-white/90">
                <li>
                  <a href="#certificados" className="hover:underline">
                    Emitir Certificado 30h
                  </a>
                </li>
                <li>
                  <a href="#certificados" className="hover:underline">
                    2ª Via de QR Code
                  </a>
                </li>
                <li>
                  <a href="#certificados" className="hover:underline">
                    Consultar Frequência
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setViewMode('admin')}
                    className="hover:underline text-left"
                  >
                    Credenciamento Digital
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Campo rápido "Autenticar Certificado" no Rodapé */}
            <div className="lg:col-span-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-100">
                Autenticar Certificado por Código Único
              </p>
              <p className="text-xs text-sky-100">
                Verifique a autenticidade de certificados emitidos nesta edição informando o código Hash:
              </p>
              <form onSubmit={handleFooterHashSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={footerHashInput}
                  onChange={(e) => setFooterHashInput(e.target.value)}
                  placeholder="Ex: CERT-SAP26-8F4A-992B"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/30 border border-white/30 text-white placeholder-sky-100/70 text-xs font-mono uppercase focus:outline-none focus:bg-slate-950/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-[#0F172A] hover:bg-sky-50 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  Validar
                </button>
              </form>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sky-100">
            <p>
              © 2026 Portal da Semana Acadêmica de Pedagogia · Inspirado na plataforma Even3.
            </p>
            <div className="flex items-center gap-6">
              <a href="#sobre" className="hover:underline">
                Regulamento Acadêmico
              </a>
              <a href="#certificados" className="hover:underline">
                Autenticidade MEC/FEUSP
              </a>
              <button
                type="button"
                onClick={() => setViewMode('admin')}
                className="hover:underline font-semibold text-white"
              >
                Área da Organização
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Inscrição */}
      <RegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        activities={activities}
        participants={participants}
        settings={settings}
        preselectedActivityId={preselectedWorkshopId}
        onRegister={handleRegisterParticipant}
      />
    </div>
  );
}
