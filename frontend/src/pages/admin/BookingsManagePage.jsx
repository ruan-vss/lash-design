import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { LoadingState, ErrorState, EmptyState, StatusBadge, Button } from '../../components/common/UI';
import { BookingStatusActions } from '../../components/admin/BookingStatusActions';
import { useAuth } from '../../contexts/AuthContext';

export const BookingsManagePage = () => {
  const { user } = useAuth();
  const [statusBusy, setStatusBusy] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [depositBooking, setDepositBooking] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('CASH');
  const [depositNote, setDepositNote] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.listAdminBookings({ search, status, page, limit: 15 });
      setBookings(data.bookings || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (id, newStatus, reason) => {
    setStatusBusy(true);
    try {
      await bookingService.updateBookingStatus(id, { status: newStatus, reason });
      toast.success('Reserva atualizada com sucesso!');
      fetchBookings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setStatusBusy(false);
    }
  };

  const openDepositModal = (b) => {
    setDepositBooking(b);
    setDepositAmount(b.depositAmount > b.depositPaidAmount ? String(b.depositAmount - b.depositPaidAmount) : '');
    setDepositMethod('CASH');
    setDepositNote('');
  };

  const handleRegisterDeposit = async (e) => {
    e.preventDefault();
    if (!depositBooking) return;
    setSavingDeposit(true);
    try {
      await paymentService.registerDeposit(depositBooking.id, {
        amount: Number(depositAmount),
        method: depositMethod,
        note: depositNote,
      });
      toast.success('Sinal registrado com sucesso!');
      setDepositBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingDeposit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Reservas</span>
        <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
          Reservas
        </h1>
        <p className="text-small text-nude-700">
          Busque, aprove e acompanhe os agendamentos em um só lugar.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3.5 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-nude-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por cliente, código ou telefone..."
            className="input-field pl-10"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input-field w-auto"
        >
          <option value="">Todos os status</option>
          <option value="PENDING_APPROVAL">Aguardando Aprovação</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="NO_SHOW">Falta</option>
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBookings} />
      ) : bookings.length === 0 ? (
        <EmptyState title="Nenhuma reserva encontrada para os filtros aplicados" />
      ) : (
        <div className="table-container">
          <div className="table-scroll">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Data / Hora</th>
                  <th>Total / Sinal</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-bold tabular-nums">#{b.code}</td>
                    <td>
                      <strong className="block text-espresso-900 font-semibold">{b.clientName}</strong>
                      <span className="text-caption text-nude-600 tabular-nums">{b.clientPhone}</span>
                    </td>
                    <td>{b.serviceNames}</td>
                    <td className="tabular-nums whitespace-nowrap">
                      {formatDate(b.date)} às {b.startTime}
                    </td>
                    <td className="tabular-nums whitespace-nowrap">
                      <span className="font-semibold">Total: {formatCurrency(b.totalPrice)}</span>
                      <span className="block text-caption text-emerald-700 font-medium">
                        Sinal: {formatCurrency(b.depositPaidAmount)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {['PENDING_APPROVAL', 'CONFIRMED'].includes(b.status) && b.remainingBalance > 0 && (
                        <Button size="sm" variant="secondary" onClick={() => openDepositModal(b)}>
                          Registrar sinal
                        </Button>
                      )}
                      <BookingStatusActions booking={b} role={user?.role} onChange={handleStatusChange} busy={statusBusy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-nude-200 flex items-center justify-between text-caption font-medium">
            <span className="tabular-nums">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      {depositBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleRegisterDeposit}
            className="bg-white border border-nude-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-lifted"
          >
            <div className="flex items-start justify-between border-b border-nude-100 pb-4">
              <h3 className="font-serif text-2xl font-semibold text-espresso-900">
                Registrar sinal (#{depositBooking.code})
              </h3>
              <button
                type="button"
                onClick={() => setDepositBooking(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-small text-nude-700 leading-relaxed">
              Total: <strong>{formatCurrency(depositBooking.totalPrice)}</strong> | Sinal sugerido:{' '}
              <strong>{formatCurrency(depositBooking.depositAmount)}</strong> | Restante:{' '}
              <strong>{formatCurrency(depositBooking.remainingBalance)}</strong>
            </p>
            <div>
              <label htmlFor="bookingsma-f1" className="label-field">Valor recebido (R$) *</label>
              <input id="bookingsma-f1"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input-field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="bookingsma-f2" className="label-field">Forma de pagamento *</label>
              <select id="bookingsma-f2"
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className="input-field"
              >
                <option value="CASH">Dinheiro / transferência</option>
                <option value="CREDIT_CARD">Cartão presencial</option>
              </select>
            </div>
            <div>
              <label htmlFor="bookingsma-f3" className="label-field">Observação</label>
              <input id="bookingsma-f3"
                type="text"
                maxLength={300}
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDepositBooking(null)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={savingDeposit}>
                Registrar sinal
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};