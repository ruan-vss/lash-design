import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileSearch, Home } from 'lucide-react';
import { useBookingToken } from '../../hooks/useBookingToken';
import { bookingService } from '../../services/bookingService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { LoadingState, ErrorState, StatusBadge } from '../../components/common/UI';

export const BookingConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const token = useBookingToken(bookingId);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfirmation = useCallback(async () => {
    if (!bookingId) {
      setError('Identificador do agendamento ausente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getClientBookingDetails(bookingId, token);
      setBooking(data.booking);
    } catch {
      setError('Não foi possível validar os dados desta reserva no servidor.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, token]);

  useEffect(() => {
    loadConfirmation();
  }, [loadConfirmation]);

  if (loading) return <LoadingState message="Sincronizando status oficial da sua reserva..." />;
  if (error || !booking) return <ErrorState message={error} onRetry={loadConfirmation} />;

  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div className="max-w-2xl mx-auto px-3.5 sm:px-6 py-8 sm:py-14">
      <div className="card p-5 sm:p-10 shadow-soft text-center space-y-7">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
            isConfirmed
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
        >
          {isConfirmed ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>

        <div className="space-y-2">
          <StatusBadge status={booking.status} />
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 pt-1">
            {isConfirmed ? 'Agendamento Confirmado!' : 'Solicitação Recebida'}
          </h1>
          <p className="text-small text-nude-700">
            Código Oficial da Reserva:{' '}
            <strong className="text-espresso-900 font-bold tabular-nums">#{booking.code}</strong>
          </p>
        </div>

        <div className="bg-nude-50 border border-nude-200 rounded-2xl p-6 text-left space-y-3 text-small">
          <div className="flex justify-between gap-4">
            <span className="text-nude-700">Procedimento:</span>
            <strong className="text-espresso-900 text-right">{booking.serviceNames}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-nude-700">Data e Horário:</span>
            <strong className="text-espresso-900 tabular-nums">
              {formatDate(booking.date)} às {booking.startTime}
            </strong>
          </div>
          <div className="flex justify-between gap-4 pt-2 border-t border-nude-200/80">
            <span className="text-nude-700">Sinal registrado:</span>
            <strong className="text-emerald-700 font-bold tabular-nums">
              {formatCurrency(booking.depositPaidAmount)}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-nude-700">Saldo Restante no Estúdio:</span>
            <strong className="price">{formatCurrency(booking.remainingBalance)}</strong>
          </div>
        </div>

        {booking.guidelines && (
          <div className="text-left bg-white border border-nude-200 rounded-2xl p-5 text-small text-nude-800 leading-relaxed">
            <strong className="block text-espresso-900 mb-1">
              Instruções para o seu atendimento:
            </strong>
            <p>{booking.guidelines}</p>
          </div>
        )}

        <p className="text-caption text-nude-600">
          {isConfirmed
            ? 'Seu horário está confirmado. Guarde o código da reserva para consultar ou alterar o agendamento.'
            : 'Sua solicitação foi enviada e aguarda a confirmação da profissional. Guarde o código da reserva para acompanhar o status.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to={`/minhas-reservas/${booking.id}`}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-espresso-900 hover:bg-espresso-800 text-nude-50 text-small font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            Acompanhar / Gerenciar Reserva
          </Link>
          <Link
            to="/"
            className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-nude-100 hover:bg-nude-200 text-espresso-900 text-small font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
};