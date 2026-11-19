import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Award,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  QrCode,
  FileCheck2,
  User,
} from 'lucide-react';
import { Activity, EventSettings, Participant } from '../types';
import {
  calculateAttendancePercentage,
  cleanCPF,
  generateCertificatePDF,
  isEligibleForCertificate,
} from '../utils/certificatePdf';

interface CertificatePortalProps {
  participants: Participant[];
  activities: Activity[];
  settings: EventSettings;
  initialValidationCode?: string;
}

export const CertificatePortal: React.FC<CertificatePortalProps> = ({
  participants,
  activities,
  settings,
  initialValidationCode = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundParticipant, setFoundParticipant] = useState<Participant | null>(null);
  const [hasSearchedParticipant, setHasSearchedParticipant] = useState(false);

  const [validationHash, setValidationHash] = useState(initialValidationCode);
  const [validatedParticipant, setValidatedParticipant] = useState<Participant | null>(null);
  const [hasSearchedHash, setHasSearchedHash] = useState(false);

  React.useEffect(() => {
    if (initialValidationCode) {
      setValidationHash(initialValidationCode);
      handleValidateHash(undefined, initialValidationCode);
    }
  }, [initialValidationCode]);

  const handleParticipantLookup = (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const q = (presetQuery ?? searchQuery).trim();
    if (!q) return;

    const cleanedQ = cleanCPF(q);
    const match = participants.find(
      (p) =>
        (cleanedQ.length === 11 && cleanCPF(p.cpf) === cleanedQ) ||
        p.email.toLowerCase() === q.toLowerCase() ||
        p.registrationCode.toLowerCase() === q.toLowerCase()
    );

    setFoundParticipant(match || null);
    setHasSearchedParticipant(true);
  };

  const handleValidateHash = (e?: React.FormEvent, presetCode?: string) => {
    if (e) e.preventDefault();
    const code = (presetCode ?? validationHash).trim().toUpperCase();
    if (!code) return;

    const match = participants.find(
      (p) =>
        p.certificateHash.toUpperCase() === code ||
        p.registrationCode.toUpperCase() === code
    );

    setValidatedParticipant(match || null);
    setHasSearchedHash(true);
  };

  return (
    <section id="certificados" className="py-16 border-t border-slate-800/80 bg-[#0B1120]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold text-[#00A8E8] tracking-wide mb-2">
            04. Área do Participante & Certificação Digital
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
            Emissão de Certificados e Consulta de Inscrição
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            Consulte seu comprovante de credenciamento com QR Code ou emita seu certificado de{' '}
            <span className="text-slate-200 font-medium tabular-nums">
              {settings.totalHours} horas
            </span>{' '}
            mediante comprovação mínima de{' '}
            <span className="text-slate-200 font-medium tabular-nums">
              {settings.minAttendancePercent}% de frequência
            </span>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda (7 cols): Consulta do Participante por CPF ou E-mail */}
          <div className="lg:col-span-7 rounded-xl bg-[#1E293B] border border-slate-800 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#00A8E8]" />
                <h3 className="text-lg font-bold text-white font-display">
                  Consultar Inscrição & Baixar Certificado
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Busca por CPF ou E-mail
              </span>
            </div>

            <form onSubmit={(e) => handleParticipantLookup(e)} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite seu CPF (ex: 123.456.789-00) ou E-mail..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A8E8]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#00A8E8] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Consultar Dados
              </button>
            </form>

            {/* Atalhos rápidos de demonstração para teste imediato */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Testar rapidamente:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('123.456.789-00');
                  handleParticipantLookup(undefined, '123.456.789-00');
                }}
                className="text-[#00A8E8] hover:underline font-mono tabular-nums"
              >
                Beatriz (100% Presença - Apta)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('345.678.901-22');
                  handleParticipantLookup(undefined, '345.678.901-22');
                }}
                className="text-amber-400 hover:underline font-mono tabular-nums"
              >
                Camila (33% Presença - Pendente)
              </button>
            </div>

            {/* Resultado da Busca do Participante */}
            {hasSearchedParticipant && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                {foundParticipant ? (
                  <div className="space-y-5">
                    {(() => {
                      const attendancePct = calculateAttendancePercentage(foundParticipant);
                      const eligible = isEligibleForCertificate(foundParticipant, settings);

                      return (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0F172A] border border-slate-800">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{foundParticipant.affiliation}</span>
                                <span>·</span>
                                <span className="font-mono text-[#00A8E8] tabular-nums">
                                  {foundParticipant.registrationCode}
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-white font-display">
                                {foundParticipant.name}
                              </h4>
                              <p className="text-xs text-slate-400">
                                CPF: <span className="font-mono tabular-nums">{foundParticipant.cpf}</span> ·{' '}
                                {foundParticipant.institution}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg shrink-0 self-start sm:self-center">
                              <QRCodeSVG
                                value={JSON.stringify({
                                  code: foundParticipant.registrationCode,
                                  cpf: foundParticipant.cpf,
                                })}
                                size={64}
                              />
                              <div className="text-left pr-1">
                                <span className="block text-[10px] font-semibold uppercase text-slate-500">
                                  Credencial QR
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                                  {foundParticipant.registrationCode}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Barra de Frequência e Regra de Negócio >= 75% */}
                          <div className="p-4 rounded-lg bg-[#0F172A] border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-300 font-medium">
                                Frequência Registrada no Credenciamento
                              </span>
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  attendancePct >= settings.minAttendancePercent
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {attendancePct}% ({foundParticipant.attendedDays.length}/3 dias)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  attendancePct >= settings.minAttendancePercent
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${attendancePct}%` }}
                              />
                            </div>

                            {eligible ? (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                <div className="text-xs text-emerald-300 flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-white block">
                                      Certificado Liberado ({settings.totalHours}h)
                                    </span>
                                    Hash de autenticidade:{' '}
                                    <span className="font-mono text-emerald-200 tabular-nums">
                                      {foundParticipant.certificateHash}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    generateCertificatePDF(
                                      foundParticipant,
                                      settings,
                                      activities
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Baixar Certificado PDF ({settings.totalHours}h)
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2.5 text-xs text-amber-200/90 pt-1">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  {!settings.certificatesReleased ? (
                                    <span>
                                      A emissão em lote dos certificados ainda não foi liberada pela comissão organizadora.
                                    </span>
                                  ) : (
                                    <span>
                                      Frequência abaixo do mínimo exigido de{' '}
                                      <strong className="font-mono tabular-nums">
                                        {settings.minAttendancePercent}%
                                      </strong>{' '}
                                      (atual: {attendancePct}%). Caso tenha comparecido, solicite o check-in no Painel Administrativo.
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 text-sm text-slate-300 flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500 shrink-0" />
                    <span>
                      Nenhuma inscrição encontrada para <strong>{searchQuery}</strong>. Verifique o CPF ou e-mail informado.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna Direita (5 cols): Validação Pública de Autenticidade do Certificado */}
          <div className="lg:col-span-5 rounded-xl bg-[#1E293B] border border-slate-800 p-6">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white font-display">
                Autenticar Certificado Público
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Instituições, bancas examinadoras e secretarias acadêmicas podem verificar a veracidade de qualquer certificado emitido inserindo o código hash impresso no rodapé do documento.
            </p>

            <form onSubmit={(e) => handleValidateHash(e)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Código de Autenticidade (Hash)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={validationHash}
                    onChange={(e) => setValidationHash(e.target.value)}
                    placeholder="Ex: CERT-SAP26-8F4A-992B"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 text-sm font-mono uppercase focus:outline-none focus:border-[#00A8E8]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Verificar
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>Exemplo válido:</span>
              <button
                type="button"
                onClick={() => {
                  setValidationHash('CERT-SAP26-8F4A-992B');
                  handleValidateHash(undefined, 'CERT-SAP26-8F4A-992B');
                }}
                className="font-mono text-emerald-400 hover:underline tabular-nums"
              >
                CERT-SAP26-8F4A-992B
              </button>
            </div>

            {hasSearchedHash && (
              <div className="mt-5 pt-5 border-t border-slate-800">
                {validatedParticipant &&
                isEligibleForCertificate(validatedParticipant, settings) ? (
                  <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-700/50 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                      <span>Certificado Autêntico e Válido</span>
                    </div>
                    <div className="text-xs text-slate-200 space-y-1">
                      <p>
                        <span className="text-slate-400">Titular:</span>{' '}
                        <strong>{validatedParticipant.name}</strong>
                      </p>
                      <p>
                        <span className="text-slate-400">CPF:</span>{' '}
                        <span className="font-mono tabular-nums">{validatedParticipant.cpf}</span>
                      </p>
                      <p>
                        <span className="text-slate-400">Evento:</span> {settings.eventTitle}
                      </p>
                      <p>
                        <span className="text-slate-400">Carga Horária & Frequência:</span>{' '}
                        <span className="font-mono tabular-nums">
                          {settings.totalHours}h ({calculateAttendancePercentage(validatedParticipant)}% de presença)
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-400">Hash Oficial:</span>{' '}
                        <span className="font-mono text-emerald-300 tabular-nums">
                          {validatedParticipant.certificateHash}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
                    <QrCode className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Código de certificado não localizado ou participante ainda não cumpriu os requisitos mínimos de frequência ({settings.minAttendancePercent}%).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
