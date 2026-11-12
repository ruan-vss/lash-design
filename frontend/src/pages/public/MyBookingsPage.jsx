import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Search, Calendar, ArrowRight } from 'lucide-react';

import { lookupBookingSchema } from '../../schemas/validationSchemas';
import { bookingService } from '../../services/bookingService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters';
import { Button, StatusBadge, EmptyState } from '../../components/common/UI';
import { saveBookingToken } from '../../utils/bookingToken';

export const MyBookingsPage = () => {
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lookupBookingSchema),
  });

  const onLookup = async (values) => {
    setLoading(true);
    try {
      const data = await bookingService.lookupClientBookings(values);
      setBookings(data.bookings || []);
      // O token vale apenas para a reserva localizada e não fica na URL.
      (data.bookings || []).forEach((b) => saveBookingToken(b.id, data.accessToken));
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Nenhuma reserva localizada com os dados informados.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 sm:py-16">
      <div className="mb-10">
        <span className="eyebrow">Autoatendimento Seguro</span>
        <h1 className="font-serif text-h1 font-semibold text-espresso-900 mt-1">Minhas Reservas</h1>
        <p className="text-body text-nude-700 mt-1">
          Informe o código e o telefone da reserva para consultar, reagendar ou cancelar com segurança.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onLookup)}
        className="card p-4 sm:p-8 mb-10 grid grid-cols-1 sm:grid-cols-3 gap-5 items-start"
      >
        <div>
          <label htmlFor="mybookings-f1" className="label-field">Código da Reserva *</label>
          <input id="mybookings-f1"
            type="text"
            {...register('bookingCode')}
            placeholder="Ex: LASH-8492"
            className="input-field uppercase tabular-nums"
          />
          {errors.bookingCode && (
            <p className="text-caption text-rose-600 font-medium mt-1.5">{errors.bookingCode.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="mybookings-f2" className="label-field">Telefone cadastrado *</label>
          <input id="mybookings-f2"
            type="tel"
            {...register('phone')}
            onChange={(e) => setValue('phone', formatPhone(e.target.value), { shouldValidate: true })}
            placeholder="(11) 99999-9999"
            className="input-field tabular-nums"
          />
          {errors.phone && (
            <p className="text-caption text-rose-600 font-medium mt-1.5">{errors.phone.message}</p>
          )}
        </div>

        <div className="sm:pt-[26px]">
          <Button type="submit" isLoading={loading} className="w-full">
            <Search className="w-4 h-4" /> Consultar Reservas
          </Button>
        </div>
      </form>

      {bookings !== null && (
        <div>
          {bookings.length === 0 ? (
            <EmptyState
              title="Nenhum agendamento encontrado"
              description="Verifique o código enviado ao seu WhatsApp e o número de telefone digitado."
            />
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="card-interactive p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-caption font-bold text-nude-700 bg-nude-100 px-2.5 py-1 rounded-lg tabular-nums">
                        #{b.code}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <h3 className="text-h4 font-bold text-espresso-900">{b.serviceNames}</h3>
                    <p className="text-small text-nude-700 flex items-center gap-2 tabular-nums">
                      <Calendar className="w-4 h-4 text-nude-600" />
                      {formatDate(b.date)} às {b.startTime}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-nude-100">
                    <div className="sm:text-right">
                      <span className="text-caption text-nude-600 block">Saldo a pagar:</span>
                      <strong className="price text-lg">{formatCurrency(b.remainingBalance)}</strong>
                    </div>
                    <Link
                      to={`/minhas-reservas/${b.id}`}
                      className="min-h-[40px] inline-flex items-center gap-1.5 text-small font-semibold text-nude-700 hover:text-espresso-900"
                    >
                      Gerenciar reserva <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};