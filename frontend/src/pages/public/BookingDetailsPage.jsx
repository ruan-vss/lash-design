import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useBookingToken } from '../../hooks/useBookingToken';
import toast from 'react-hot-toast';
import { Calendar, Ban, RefreshCw } from 'lucide-react';

import { bookingService } from '../../services/bookingService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button, LoadingState, ErrorState, StatusBadge, ConfirmModal } from '../../components/common/UI';
import { useStudio } from '../../contexts/StudioContext';

export const BookingDetailsPage = () => {
  const { id } = useParams();
  const token = useBookingToken(id);
  const { studio } = useStudio();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getClientBookingDetails(id, token);
      setBooking(data.booking);
    } catch (err) {
      setError(extractErrorMessage(err, 'Não foi possível carregar os detalhes da reserva.'));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCancelRequest = async () => {
    setProcessingAction(true);
    try {
      const response = await bookingService.requestClientCancellation(id, {
        reason: 'Solicitado pela cliente na área Minhas Reservas',
        token,
      });
      setBooking(response.booking);
      toast.success('Cancelamento confirmado pela API!');
      setCancelModalOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cancelamento fora do prazo ou não permitido pela política.'));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRescheduleRequest = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      toast.error('Informe a nova data e horário desejados.');
      return;
    }
    setProcessingAction(true);
    try {
      const response = await bookingService.requestClientReschedule(id, {
        newDate: rescheduleDate,
        newStartTime: rescheduleTime,
        token,
      });
      setBooking(response.booking);
      toast.success('Remarcação processada pelo servidor com sucesso!');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Horário indisponível ou fora do prazo de antecedência.'));
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !booking) return <ErrorState message={error} onRetry={fetchDetails} />;

  const canModify = ['CONFIRMED', 'PENDING_APPROVAL'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="card p-4 sm:p-10 space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-nude-100 pb-5">
          <div>
            <span className="eyebrow">Reserva #{booking.code}</span>
            <h1 className="font-serif text-h2 font-semibold text-espresso-900 mt-1">
              {booking.serviceNames}
            </h1>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-small">
          <div className="bg-nude-50 border border-nude-200/80 p-5 rounded-2xl">
            <span className="text-caption uppercase tracking-wider text-nude-600 font-semibold block mb-1.5">
              Data e Horário
            </span>
            <strong className="text-body text-espresso-900 flex items-center gap-2 tabular-nums">
              <Calendar className="w-4 h-4 text-nude-600" />
              {formatDate(booking.date)} às {booking.startTime}
            </strong>
          </div>
          <div className="bg-nude-50 border border-nude-200/80 p-5 rounded-2xl space-y-1">
            <span className="text-caption uppercase tracking-wider text-nude-600 font-semibold block mb-1">
              Resumo Financeiro
            </span>
            <p className="text-espresso-900 tabular-nums">
              Total: <strong>{formatCurrency(booking.totalPrice)}</strong> | Sinal registrado:{' '}
              <strong className="text-emerald-700">{formatCurrency(booking.depositPaidAmount)}</strong>
            </p>
            <p className="text-espresso-900 tabular-nums">
              Saldo Restante: <strong className="price">{formatCurrency(booking.remainingBalance)}</strong>
            </p>
          </div>
        </div>

        <div className="text-small text-nude-800 bg-nude-50/70 border border-nude-200 rounded-2xl p-5 leading-relaxed">
          <strong className="text-espresso-900 block mb-1">Política Aplicável:</strong>
          {studio.cancellationPolicyText}
        </div>

        {canModify && studio.allowClientReschedule && (
          <form onSubmit={handleRescheduleRequest} className="border-t border-nude-200 pt-6 space-y-4">
            <h3 className="text-h4 font-bold text-espresso-900">Solicitar Remarcação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="input-field tabular-nums"
              />
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="input-field tabular-nums"
              />
              <Button type="submit" variant="secondary" isLoading={processingAction}>
                <RefreshCw className="w-4 h-4" /> Solicitar Novo Horário
              </Button>
            </div>
          </form>
        )}

        {canModify && (
          <div className="border-t border-nude-200 pt-6 flex justify-end">
            <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
              <Ban className="w-4 h-4" /> Solicitar Cancelamento da Reserva
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={cancelModalOpen}
        title="Confirmar cancelamento?"
        description="A reserva somente será cancelada após validação das regras de antecedência pelo servidor."
        confirmLabel="Confirmar Cancelamento"
        isLoading={processingAction}
        onConfirm={handleCancelRequest}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
};