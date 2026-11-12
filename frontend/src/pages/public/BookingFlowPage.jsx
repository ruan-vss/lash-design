import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, startOfToday, isBefore } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Check, Clock, Calendar as CalendarIcon, ShieldAlert, RefreshCw, Sparkles, Tag } from 'lucide-react';
import 'react-day-picker/dist/style.css';

import { serviceService } from '../../services/serviceService';
import { bookingService } from '../../services/bookingService';
import { extractErrorMessage } from '../../services/api';
import { clientBookingSchema } from '../../schemas/validationSchemas';
import { formatCurrency, formatDuration, formatPhone } from '../../utils/formatters';
import { Button, LoadingState } from '../../components/common/UI';
import { useStudio } from '../../contexts/StudioContext';
import { saveBookingToken } from '../../utils/bookingToken';

const STEPS = [
  { number: 1, title: 'Serviços' },
  { number: 2, title: 'Data' },
  { number: 3, title: 'Horário' },
  { number: 4, title: 'Seus Dados' },
  { number: 5, title: 'Revisão' },
];

const DRAFT_KEY = '@LashSaaS:bookingDraft';
const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeDraft = (draft) => {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage indisponível */ }
};
const clearDraft = () => {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage indisponível */ }
};

export const BookingFlowPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { studio } = useStudio();

  // Rascunho do fluxo (por aba): evita perder tudo ao recarregar a página.
  const draftRef = useRef(readDraft());
  const draft = draftRef.current;
  const restorableStep = draft?.selectedServiceIds?.length ? Math.min(Number(draft.step) || 1, 4) : 1;

  const [step, setStep] = useState(restorableStep);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState(draft?.selectedServiceIds || []);

  // Etapa 2 e 3: Data e Horário
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [disabledDays, setDisabledDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(draft?.selectedDate ? new Date(`${draft.selectedDate}T00:00:00`) : undefined);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(draft?.selectedSlot || '');

  // Etapa 5: Preview Oficial do Servidor
  const [couponCode, setCouponCode] = useState(draft?.couponCode || '');
  const [serverPreview, setServerPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientBookingSchema),
    defaultValues: {
      fullName: draft?.form?.fullName || '',
      phone: draft?.form?.phone || '',
      email: draft?.form?.email || '',
      notes: draft?.form?.notes || '',
      acceptTerms: false,
      // LGPD: o consentimento deve ser um ato ativo da cliente, nunca pré-marcado.
      whatsappConsent: false,
    },
  });

  // Persiste o rascunho a cada mudança relevante (sem aceite de termos/consentimento).
  useEffect(() => {
    const save = (form) => writeDraft({
      step,
      selectedServiceIds,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      selectedSlot,
      couponCode,
      form: { fullName: form.fullName, phone: form.phone, email: form.email, notes: form.notes },
    });
    save(getValues());
    const subscription = watch((values) => save(values));
    return () => subscription.unsubscribe();
  }, [step, selectedServiceIds, selectedDate, selectedSlot, couponCode, getValues, watch]);

  useEffect(() => {
    const load = async () => {
      setLoadingServices(true);
      try {
        const data = await serviceService.getPublicServices();
        const activeList = (data.services || []).filter((s) => s.active !== false);
        setServices(activeList);
        const preselected = searchParams.get('serviceId');
        if (preselected && activeList.some((s) => String(s.id) === preselected)) {
          setSelectedServiceIds([preselected]);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Erro ao carregar serviços disponíveis.'));
      } finally {
        setLoadingServices(false);
      }
    };
    load();
  }, [searchParams]);

  const fetchCalendarAvailability = useCallback(async () => {
    if (selectedServiceIds.length === 0) return;
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const data = await bookingService.getMonthlyAvailability({
        year,
        month,
        serviceIds: selectedServiceIds,
      });
      const unavailableDates = (data.unavailableDates || []).map((d) => new Date(`${d}T00:00:00`));
      setDisabledDays(unavailableDates);
    } catch {
      // Mantém bloqueio de datas passadas
    }
  }, [currentMonth, selectedServiceIds]);

  useEffect(() => {
    if (step === 2) {
      fetchCalendarAvailability();
    }
  }, [step, fetchCalendarAvailability]);

  const fetchSlotsForDate = useCallback(async (dateObj, { keepSlot = false } = {}) => {
    if (!dateObj || selectedServiceIds.length === 0) return;
    setLoadingSlots(true);
    if (!keepSlot) setSelectedSlot('');
    try {
      const formattedDate = format(dateObj, 'yyyy-MM-dd');
      const data = await bookingService.getAvailableSlots({
        date: formattedDate,
        serviceIds: selectedServiceIds,
      });
      setAvailableSlots(data.slots || []);
      if (keepSlot) setSelectedSlot((prev) => ((data.slots || []).includes(prev) ? prev : ''));
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao consultar horários disponíveis.'));
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedServiceIds]);

  useEffect(() => {
    if (restorableStep >= 3 && selectedDate) {
      fetchSlotsForDate(selectedDate, { keepSlot: true });
    }
    // Executa apenas uma vez, ao restaurar o rascunho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleServiceSelection = (id) => {
    const strId = String(id);
    if (!studio.allowMultipleServices) {
      setSelectedServiceIds([strId]);
      return;
    }
    setSelectedServiceIds((prev) =>
      prev.includes(strId) ? prev.filter((item) => item !== strId) : [...prev, strId]
    );
  };

  const proceedToReview = async () => {
    setLoadingPreview(true);
    try {
      const preview = await bookingService.calculateSummary({
        serviceIds: selectedServiceIds,
        couponCode: couponCode.trim() || undefined,
      });
      setServerPreview(preview);
      setStep(5);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Não foi possível validar os valores no servidor.'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmBookingRequest = async () => {
    setSubmittingBooking(true);
    try {
      const clientData = getValues();
      const payload = {
        serviceIds: selectedServiceIds,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot,
        couponCode: couponCode.trim() || undefined,
        client: clientData,
      };

      const response = await bookingService.createBooking(payload);
      saveBookingToken(response.booking.id, response.booking.accessToken);
      clearDraft();
      navigate(`/agendamento/confirmacao?id=${response.booking.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Este horário acabou de ser preenchido. Por favor, escolha outro horário.');
        await fetchSlotsForDate(selectedDate);
        setStep(3);
      } else {
        toast.error(extractErrorMessage(err));
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  const selectedServicesObjects = services.filter((s) => selectedServiceIds.includes(String(s.id)));

  return (
    <div className="public-booking max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-14">
      {/* Stepper Horizontal estilo CentraCart */}
      <nav aria-label="Etapas do agendamento" className="mb-10">
        <div className="booking-stepper card p-3 sm:p-6">
          <div className="relative flex items-center justify-between">
            <div
              className="absolute left-0 top-5 w-full h-0.5 bg-nude-200 -z-0 hidden sm:block"
              aria-hidden="true"
            />
            {STEPS.map((s) => {
              const isCompleted = step > s.number;
              const isCurrent = step === s.number;
              return (
                <div key={s.number} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-caption font-bold transition-all duration-250 tabular-nums ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-espresso-900 text-nude-50 ring-4 ring-nude-200 shadow-soft'
                        : 'bg-nude-100 text-nude-600 border border-nude-200'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <span
                    className={`text-caption mt-2 hidden sm:block transition-colors ${
                      isCurrent ? 'font-bold text-espresso-900' : 'font-medium text-nude-600'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="sm:hidden mt-3 text-center">
            <span className="text-caption uppercase tracking-widest text-nude-600 font-semibold">
              Etapa {step} de {STEPS.length}:{' '}
              <strong className="text-espresso-900">{STEPS[step - 1]?.title}</strong>
            </span>
          </div>
        </div>
      </nav>

      {/* ETAPA 1: Escolher Serviço */}
      {step === 1 && (
        <div className="booking-card card p-4 sm:p-10 space-y-6 sm:space-y-8">
          <div className="border-b border-nude-100 pb-5">
            <span className="eyebrow">Passo 01</span>
            <h2 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
              Escolha o procedimento
            </h2>
            <p className="text-small text-nude-700 mt-1">
              Selecione o serviço desejado para consultarmos a disponibilidade exata da agenda.
            </p>
          </div>

          {loadingServices ? (
            <LoadingState />
          ) : (
            <div className="space-y-3.5">
              {services.map((service) => {
                const isSelected = selectedServiceIds.includes(String(service.id));
                return (
                  <div
                    key={service.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleServiceSelection(service.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleServiceSelection(service.id);
                      }
                    }}
                    className={`cursor-pointer border rounded-2xl p-5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 ${
                      isSelected
                        ? 'border-nude-600 bg-nude-50/90 ring-1 ring-nude-600 shadow-soft'
                        : 'border-nude-200 bg-white hover:border-nude-400'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <span className="text-caption uppercase tracking-[0.12em] text-nude-600 font-semibold">
                        {service.category}
                      </span>
                      <h3 className="text-h4 font-bold text-espresso-900">{service.name}</h3>
                      <p className="text-small text-nude-700 leading-relaxed">{service.description}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-caption text-nude-700 font-medium">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-nude-500" />
                          {formatDuration(service.durationMinutes)}
                        </span>
                        {service.depositType !== 'NONE' && service.depositValue > 0 && (
                          <span className="tabular-nums">
                            • Sinal sugerido:{' '}
                            <strong className="text-espresso-900">
                              {service.depositType === 'PERCENTAGE'
                                ? `${service.depositValue}%`
                                : formatCurrency(service.depositValue)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-nude-100">
                      <span className="price text-xl">{formatCurrency(service.price)}</span>
                      <span
                        className={`min-h-[38px] inline-flex items-center gap-1.5 text-caption px-4 py-1.5 rounded-xl font-semibold transition-colors ${
                          isSelected
                            ? 'bg-espresso-900 text-nude-50'
                            : 'bg-nude-100 text-nude-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="booking-actions flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-nude-100">
            <Button size="lg" disabled={selectedServiceIds.length === 0} onClick={() => setStep(2)}>
              Continuar para Data
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Escolher Data */}
      {step === 2 && (
        <div className="booking-card card p-4 sm:p-10 space-y-6 sm:space-y-8">
          <div className="border-b border-nude-100 pb-5">
            <span className="eyebrow">Passo 02</span>
            <h2 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
              Escolha a melhor data
            </h2>
            <p className="text-small text-nude-700 mt-1">
              Datas passadas, folgas e feriados configurados estão desabilitados automaticamente.
            </p>
          </div>

          <div className="booking-calendar flex justify-center border border-nude-200 rounded-2xl sm:rounded-3xl p-2 sm:p-6 bg-nude-50/60 w-full max-w-md mx-auto shadow-inner overflow-hidden">
            <DayPicker
              mode="single"
              locale={ptBR}
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={[{ before: startOfToday() }, ...disabledDays]}
            />
          </div>

          <div className="booking-actions flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-nude-100">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button
              size="lg"
              disabled={!selectedDate || isBefore(selectedDate, startOfToday())}
              onClick={() => {
                fetchSlotsForDate(selectedDate);
                setStep(3);
              }}
            >
              Consultar Horários
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Escolher Horário */}
      {step === 3 && (
        <div className="booking-card card p-4 sm:p-10 space-y-6 sm:space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-nude-100 pb-5">
            <div>
              <span className="eyebrow">Passo 03</span>
              <h2 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
                Escolha o horário
              </h2>
              <p className="text-small text-nude-700 mt-1">
                Horários livres em{' '}
                <strong className="text-espresso-900 tabular-nums">
                  {selectedDate && format(selectedDate, 'dd/MM/yyyy')}
                </strong>{' '}
                considerando duração e biossegurança.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchSlotsForDate(selectedDate)}>
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
          </div>

          {loadingSlots ? (
            <LoadingState message="Verificando disponibilidade em tempo real..." />
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12 bg-nude-50 rounded-3xl border border-nude-200">
              <CalendarIcon className="w-10 h-10 text-nude-500 mx-auto mb-3" />
              <p className="text-h4 font-bold text-espresso-900">Nenhum horário livre nesta data</p>
              <p className="text-small text-nude-700 mt-1">
                Por favor, retorne e selecione outro dia no calendário.
              </p>
            </div>
          ) : (
            <div className="booking-slots grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3.5">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`min-h-[48px] py-3 px-4 rounded-2xl text-small font-bold border tabular-nums transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nude-600 ${
                    selectedSlot === slot
                      ? 'bg-espresso-900 text-nude-50 border-espresso-900 shadow-soft scale-[1.02]'
                      : 'bg-white text-espresso-900 border-nude-200 hover:border-nude-500 hover:bg-nude-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}

          <div className="booking-actions flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-nude-100">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Escolher outra data
            </Button>
            <Button size="lg" disabled={!selectedSlot} onClick={() => setStep(4)}>
              Continuar para Identificação
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Dados da Cliente */}
      {step === 4 && (
        <form
          onSubmit={handleSubmit(proceedToReview)}
          className="booking-card card p-4 sm:p-10 space-y-6"
        >
          <div className="border-b border-nude-100 pb-5">
            <span className="eyebrow">Passo 04</span>
            <h2 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
              Seus dados de contato
            </h2>
            <p className="text-small text-nude-700 mt-1">
              Utilizaremos seu WhatsApp para enviar o comprovante e orientações pré-procedimento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="bookingflo-f1" className="label-field">Nome Completo *</label>
              <input id="bookingflo-f1"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                {...register('fullName')}
                placeholder="Ex: Mariana Oliveira"
                className="input-field"
              />
              {errors.fullName && (
                <p role="alert" className="text-caption text-rose-600 font-medium mt-1.5">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="bookingflo-f2" className="label-field">Telefone / WhatsApp com DDD *</label>
              <input id="bookingflo-f2"
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                {...register('phone')}
                onChange={(e) => setValue('phone', formatPhone(e.target.value), { shouldValidate: true })}
                placeholder="(11) 99999-9999"
                className="input-field tabular-nums"
              />
              {errors.phone && (
                <p role="alert" className="text-caption text-rose-600 font-medium mt-1.5">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="bookingflo-f3" className="label-field">E-mail (Opcional)</label>
            <input id="bookingflo-f3" autoComplete="email" aria-invalid={Boolean(errors.email)}
              type="email"
              {...register('email')}
              placeholder="seuemail@exemplo.com"
              className="input-field"
            />
            {errors.email && (
              <p role="alert" className="text-caption text-rose-600 font-medium mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bookingflo-notes" className="label-field">
              Observações relevantes (alergias, sensibilidade ocular, remoção necessária)
            </label>
            <textarea
              id="bookingflo-notes"
              rows={3}
              {...register('notes')}
              placeholder="Informe caso possua extensão de outro profissional ou sensibilidade..."
              className="input-field"
            />
            {errors.notes && (
              <p role="alert" className="text-caption text-rose-600 font-medium mt-1.5">{errors.notes.message}</p>
            )}
          </div>

          <div className="space-y-3.5 pt-4 border-t border-nude-100 bg-nude-50/60 p-4 sm:p-5 rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer text-small text-nude-800">
              <input
                type="checkbox"
                {...register('acceptTerms')}
                className="mt-1 w-4 h-4 rounded border-nude-400 text-nude-600 focus:ring-nude-500"
              />
              <span>
                Li e concordo com os Termos de Uso e com a{' '}
                <a
                  href="/politica-de-cancelamento"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold text-espresso-900"
                >
                  Política de Sinal, Atrasos e Cancelamento
                </a>
                . *
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-caption text-rose-600 font-medium">{errors.acceptTerms.message}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer text-small text-nude-800">
              <input
                type="checkbox"
                {...register('whatsappConsent')}
                className="mt-1 w-4 h-4 rounded border-nude-400 text-nude-600 focus:ring-nude-500"
              />
              <span>Autorizo o envio de lembretes e atualizações do meu agendamento via WhatsApp.</span>
            </label>
          </div>

          <div className="booking-actions flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-nude-100">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Voltar
            </Button>
            <Button type="submit" size="lg" isLoading={loadingPreview}>
              Revisar Pedido
            </Button>
          </div>
        </form>
      )}

      {/* ETAPA 5: Revisão Oficial do Pedido (Order Summary estilo CentraCart) */}
      {step === 5 && serverPreview && (
        <div className="booking-card card p-4 sm:p-10 space-y-6 sm:space-y-8">
          <div className="border-b border-nude-100 pb-5">
            <span className="eyebrow">Passo 05</span>
            <h2 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
              Revise seu agendamento
            </h2>
            <p className="text-small text-nude-700 mt-1">
              Valores e condições validados diretamente pelo servidor oficial do estúdio.
            </p>
          </div>

          <div className="bg-nude-50 border border-nude-200 rounded-3xl p-6 sm:p-8 space-y-4 text-small">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-nude-700">Data e Horário Reservado:</span>
              <strong className="text-espresso-900 tabular-nums">
                {selectedDate && format(selectedDate, 'dd/MM/yyyy')} às {selectedSlot}
              </strong>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-nude-700">Procedimento(s):</span>
              <strong className="text-espresso-900">
                {selectedServicesObjects.map((s) => s.name).join(' + ')}
              </strong>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-nude-700">Duração Total Estimada:</span>
              <strong className="text-espresso-900 tabular-nums">
                {formatDuration(serverPreview.totalDurationMinutes)}
              </strong>
            </div>

            <hr className="border-nude-200 my-2" />

            <div className="flex justify-between items-center text-body">
              <span className="text-nude-800 font-medium">Valor Total Oficial:</span>
              <strong className="price text-xl">{formatCurrency(serverPreview.totalPrice)}</strong>
            </div>
            <div className="flex justify-between items-center text-small bg-white border border-nude-200/80 p-3.5 rounded-2xl">
              <span className="text-nude-800 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-nude-600" />
                Sinal sugerido (combinado com o estúdio):
              </span>
              <strong className="price text-lg text-nude-700">
                {formatCurrency(serverPreview.depositAmount)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-small pt-1">
              <span className="text-nude-700">Restante após o sinal:</span>
              <strong className="price text-base">
                {formatCurrency(serverPreview.remainingBalance)}
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-nude-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Cupom promocional"
                className="input-field pl-10 uppercase"
              />
            </div>
            <Button variant="secondary" onClick={proceedToReview} isLoading={loadingPreview}>
              Aplicar Cupom
            </Button>
          </div>

          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5 text-caption text-amber-900 leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Política de Confirmação e Cancelamento:</strong>
              <p>{studio.cancellationPolicyText}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-nude-100">
            <Button variant="secondary" onClick={() => setStep(4)}>
              Editar Dados
            </Button>
            <Button size="lg" onClick={handleConfirmBookingRequest} isLoading={submittingBooking}>
              Enviar Solicitação de Agendamento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};