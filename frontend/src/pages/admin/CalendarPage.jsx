import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, addWeeks, subWeeks, startOfWeek, isSameDay } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Plus, X, AlertCircle } from 'lucide-react';

import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { extractErrorMessage } from '../../services/api';
import { manualBookingSchema } from '../../schemas/validationSchemas';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { Button, LoadingState, StatusBadge, EmptyState } from '../../components/common/UI';
import { BookingStatusActions } from '../../components/admin/BookingStatusActions';
import { useAuth } from '../../contexts/AuthContext';

export const CalendarPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('DAY'); // DAY | WEEK | MONTH
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeBookingModal, setActiveBookingModal] = useState(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatBookingDate = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return `${weekdayLabels[parsed.getDay()]}, ${format(parsed, 'dd/MM/yyyy')}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(manualBookingSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'CONFIRMED',
      serviceIds: [],
    },
  });

  const loadAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, servicesRes] = await Promise.all([
        bookingService.listAdminBookings({
          date: format(selectedDate, 'yyyy-MM-dd'),
          viewMode,
          status: statusFilter || undefined,
        }),
        serviceService.getAdminServices(),
      ]);
      setBookings(bookingsRes.bookings || []);
      setServices(servicesRes.services || []);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao carregar agenda.'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode, statusFilter]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setManualModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleStatusChange = async (bookingId, newStatus, reason) => {
    setSubmitting(true);
    try {
      await bookingService.updateBookingStatus(bookingId, { status: newStatus, reason });
      toast.success('Status atualizado.');
      setActiveBookingModal(null);
      loadAgenda();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateManual = async (values) => {
    setSubmitting(true);
    try {
      await bookingService.createManualBooking(values);
      toast.success('Agendamento manual registrado na agenda!');
      setManualModalOpen(false);
      reset();
      loadAgenda();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Conflito de horário detectado pelo servidor.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Planejamento Diário</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Agenda
          </h1>
          <p className="text-small text-nude-700">
            Visualize os horários do dia, aprove reservas e crie encaixes.
          </p>
        </div>

        <Button onClick={() => setManualModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nova reserva
        </Button>
      </div>

      {/* Barra de Navegação e Filtros */}
      <div className="card p-3 sm:p-4 flex flex-col 2xl:flex-row 2xl:items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto pb-1 2xl:pb-0 2xl:flex-1">
          <button
            type="button"
            onClick={() => setSelectedDate(subWeeks(selectedDate, 1))}
            className="h-14 min-w-12 inline-flex items-center justify-center rounded-xl border border-nude-200 bg-white text-espresso-900 hover:bg-nude-100 hover:border-nude-300 transition-colors shrink-0"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            className="grid grid-cols-7 gap-2 min-w-[650px] flex-1"
            role="group"
            aria-label="Selecionar dia da semana"
          >
            {weekDays.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const today = isSameDay(day, new Date());

              return (
                <button
                  key={format(day, 'yyyy-MM-dd')}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  aria-pressed={selected}
                  className={`h-14 px-3 rounded-xl border text-center transition-colors ${
                    selected
                      ? 'bg-espresso-900 border-espresso-900 text-white'
                      : 'bg-white border-nude-200 text-espresso-900 hover:bg-nude-100 hover:border-nude-300'
                  }`}
                >
                  <span
                    className={`block text-[10px] sm:text-caption font-semibold uppercase tracking-wide leading-tight ${
                      selected ? 'text-nude-100' : 'text-nude-600'
                    }`}
                  >
                    {weekdayLabels[day.getDay()]}
                  </span>
                  <span className="block text-sm sm:text-body font-bold tabular-nums leading-tight mt-0.5">
                    {format(day, 'dd')}
                  </span>
                  {today && (
                    <span
                      className={`block text-[9px] font-semibold leading-none mt-0.5 ${
                        selected ? 'text-nude-100' : 'text-terracotta-700'
                      }`}
                    >
                      Hoje
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
            className="h-14 min-w-12 inline-flex items-center justify-center rounded-xl border border-nude-200 bg-white text-espresso-900 hover:bg-nude-100 hover:border-nude-300 transition-colors shrink-0"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 2xl:shrink-0">
          <div
            className="grid grid-cols-3 gap-2 w-full lg:w-auto"
            role="group"
            aria-label="Modo de visualização da agenda"
          >
            {['DAY', 'WEEK', 'MONTH'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`h-14 min-w-[92px] px-4 rounded-xl border text-small font-semibold transition-colors ${
                  viewMode === mode
                    ? 'bg-espresso-900 border-espresso-900 text-white'
                    : 'bg-white border-nude-200 text-espresso-900 hover:bg-nude-100 hover:border-nude-300'
                }`}
              >
                {mode === 'DAY' ? 'Dia' : mode === 'WEEK' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field h-14 min-h-14 w-full lg:w-[220px] rounded-xl"
            aria-label="Filtrar agenda por status"
          >
            <option value="">Todos os Status</option>
            <option value="PENDING_APPROVAL">Aguardando Aprovação</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="COMPLETED">Concluídos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Agenda livre para este filtro"
          description="Nenhum atendimento agendado para a data ou status selecionado."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bookings.map((b) => (
            <div
              key={b.id}
              onClick={() => setActiveBookingModal(b)}
              className="cursor-pointer card-interactive p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {viewMode !== 'DAY' && (
                    <span className="text-caption font-semibold text-terracotta-800 bg-terracotta-50 border border-terracotta-100 px-3 py-1.5 rounded-xl tabular-nums">
                      {formatBookingDate(b.date)}
                    </span>
                  )}
                  <span className="text-body font-bold text-espresso-900 tabular-nums bg-nude-100 px-3 py-1.5 rounded-xl">
                    {b.startTime} – {b.endTime}
                  </span>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div>
                <h3 className="text-h4 font-bold text-espresso-900">{b.clientName}</h3>
                <p className="text-small text-nude-700 mt-0.5">{b.serviceNames}</p>
              </div>
              {b.remainingBalance > 0 && (
                <div className="flex items-center gap-2 text-caption font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl tabular-nums">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  Saldo a receber: {formatCurrency(b.remainingBalance)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes e Ações Rápidas do Agendamento */}
      {activeBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-nude-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-lifted">
            <div className="flex items-start justify-between border-b border-nude-100 pb-4">
              <div>
                <span className="eyebrow">Reserva #{activeBookingModal.code}</span>
                <h3 className="font-serif text-2xl font-semibold text-espresso-900 mt-1">
                  {activeBookingModal.clientName}
                </h3>
              </div>
              <button
                onClick={() => setActiveBookingModal(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-small space-y-2.5 text-nude-800 bg-nude-50 p-5 rounded-2xl border border-nude-200/80">
              <p className="tabular-nums">
                <strong className="text-espresso-900">Telefone:</strong> {activeBookingModal.clientPhone}
              </p>
              <p>
                <strong className="text-espresso-900">Serviços:</strong> {activeBookingModal.serviceNames}
              </p>
              <p className="tabular-nums">
                <strong className="text-espresso-900">Horário:</strong> {activeBookingModal.date} das{' '}
                {activeBookingModal.startTime} às {activeBookingModal.endTime}
              </p>
              <p className="tabular-nums">
                <strong className="text-espresso-900">Financeiro:</strong> Total{' '}
                {formatCurrency(activeBookingModal.totalPrice)} | Sinal Pago:{' '}
                {formatCurrency(activeBookingModal.depositPaidAmount)}
              </p>
              {activeBookingModal.notes && (
                <p>
                  <strong className="text-espresso-900">Obs. da Cliente:</strong> {activeBookingModal.notes}
                </p>
              )}
            </div>

            <div className="border-t border-nude-100 pt-4 flex flex-wrap gap-2.5">
              <BookingStatusActions booking={activeBookingModal} role={user?.role} onChange={handleStatusChange} busy={submitting} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Agendamento Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit(onCreateManual)}
            className="bg-white border border-nude-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-lifted"
          >
            <div className="flex items-center justify-between border-b border-nude-100 pb-4">
              <h3 className="font-serif text-2xl font-semibold text-espresso-900">
                Nova reserva
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="calendar-f1" className="label-field">Nome da Cliente *</label>
                <input id="calendar-f1" {...register('clientName')} className="input-field" />
                {errors.clientName && (
                  <p className="text-caption text-rose-600 mt-1">{errors.clientName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="calendar-f2" className="label-field">WhatsApp *</label>
                <input id="calendar-f2"
                  {...register('clientPhone')}
                  onChange={(e) =>
                    setValue('clientPhone', formatPhone(e.target.value), { shouldValidate: true })
                  }
                  className="input-field tabular-nums"
                />
                {errors.clientPhone && (
                  <p className="text-caption text-rose-600 mt-1">{errors.clientPhone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="calendar-f3" className="label-field">Procedimento (segure Ctrl para múltiplos) *</label>
              <select id="calendar-f3"
                multiple
                {...register('serviceIds')}
                className="input-field h-28"
              >
                {services.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({formatCurrency(s.price)})
                  </option>
                ))}
              </select>
              {errors.serviceIds && (
                <p className="text-caption text-rose-600 mt-1">{errors.serviceIds.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="calendar-f4" className="label-field">Data *</label>
                <input id="calendar-f4" type="date" {...register('date')} className="input-field tabular-nums" />
              </div>
              <div>
                <label htmlFor="calendar-f5" className="label-field">Horário Inicial *</label>
                <input id="calendar-f5" type="time" {...register('startTime')} className="input-field tabular-nums" />
              </div>
            </div>

            <div>
              <label htmlFor="calendar-f6" className="label-field">Observações Internas</label>
              <textarea id="calendar-f6" rows={2} {...register('internalNotes')} className="input-field" />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-nude-100">
              <Button variant="secondary" onClick={() => setManualModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submitting}>
                Validar e Salvar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};