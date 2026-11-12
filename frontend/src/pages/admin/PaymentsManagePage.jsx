import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, FilePlus2, X } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button, LoadingState, ErrorState, EmptyState } from '../../components/common/UI';


const paymentMethodLabels = {
  CASH: 'Dinheiro / presencial',
  CREDIT_CARD: 'Cartão',
  ADMIN_AUDIT: 'Ajuste administrativo',
};

const paymentStatusLabels = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  REFUNDED: 'Estornado',
  CANCELLED: 'Cancelado',
};

export const PaymentsManagePage = () => {
  const [transactions, setTransactions] = useState([]);
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [auditModalBooking, setAuditModalBooking] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.listTransactions({ method, status, page, limit: 20 });
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [method, status, page]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleExportCsv = async () => {
    try {
      const blob = await paymentService.exportTransactionsCsv({ method, status });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `financeiro-lash-${Date.now()}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao exportar CSV.'));
    }
  };

  const handleAuditAdjustment = async (e) => {
    e.preventDefault();
    if (!auditModalBooking) return;
    setSubmitting(true);
    try {
      await paymentService.createAuditAdjustment(auditModalBooking.bookingId, {
        amount: Number(adjustmentAmount),
        reason: adjustmentReason,
      });
      toast.success('Lançamento de ajuste auditável registrado com sucesso!');
      setAuditModalBooking(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      loadPayments();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Financeiro</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Financeiro
          </h1>
          <p className="text-small text-nude-700">
            Acompanhe sinais, saldos e ajustes financeiros das reservas.
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportCsv}>
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3.5">
        <select
          value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="">Todos os métodos</option>
          <option value="CREDIT_CARD">Cartão de Crédito</option>
          <option value="CASH">Dinheiro / presencial</option>
          <option value="ADMIN_AUDIT">Ajuste administrativo</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="">Todos os status</option>
          <option value="PAID">Confirmado</option>
          <option value="PENDING">Pendente</option>
          <option value="REFUNDED">Estornado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayments} />
      ) : transactions.length === 0 ? (
        <EmptyState title="Nenhuma transação financeira registrada no filtro atual" />
      ) : (
        <div className="table-container">
          <div className="table-scroll">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Cliente / Serviço</th>
                  <th>Total / Sinal Devido</th>
                  <th>Sinal Pago / Saldo</th>
                  <th>Método / Status</th>
                  <th>Data</th>
                  <th className="text-right">Auditoria</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-bold tabular-nums">#{tx.bookingCode}</td>
                    <td>
                      <strong className="block text-espresso-900 font-semibold">{tx.clientName}</strong>
                      <span className="text-caption text-nude-600">{tx.serviceName}</span>
                    </td>
                    <td className="tabular-nums whitespace-nowrap">
                      Total: {formatCurrency(tx.totalAmount)}
                      <span className="block text-caption text-nude-600">
                        Sinal devido: {formatCurrency(tx.depositDue)}
                      </span>
                    </td>
                    <td className="tabular-nums whitespace-nowrap">
                      <strong className="text-emerald-700">Pago: {formatCurrency(tx.depositPaid)}</strong>
                      <span className="block text-caption text-amber-800 font-medium">
                        Restante: {formatCurrency(tx.remainingBalance)}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium">
                        {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod} · {paymentStatusLabels[tx.status] || tx.status}
                      </span>
                      {tx.auditReason && (
                        <span className="block text-caption text-nude-500">{tx.auditReason}</span>
                      )}
                    </td>
                    <td className="tabular-nums whitespace-nowrap">
                      {formatDate(tx.createdAt, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setAuditModalBooking(tx)}>
                        <FilePlus2 className="w-3.5 h-3.5" /> Ajuste Auditável
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-nude-200 flex items-center justify-between text-caption font-medium">
            <span className="tabular-nums">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      )}

      {auditModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAuditAdjustment}
            className="bg-white border border-nude-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-lifted"
          >
            <div className="flex items-start justify-between border-b border-nude-100 pb-4">
              <h3 className="font-serif text-2xl font-semibold text-espresso-900">
                Ajuste Auditável (#{auditModalBooking.bookingCode})
              </h3>
              <button
                type="button"
                onClick={() => setAuditModalBooking(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-nude-500 hover:bg-nude-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-small text-nude-700 leading-relaxed">
              Esta operação não altera lançamentos anteriores. Ela cria um lançamento contábil vinculado ao
              seu usuário administrativo.
            </p>
            <div>
              <label htmlFor="paymentsma-f1" className="label-field">Valor Recebido Presencialmente / Ajuste (R$) *</label>
              <input id="paymentsma-f1"
                type="number"
                step="0.01"
                required
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                className="input-field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="paymentsma-f2" className="label-field">Justificativa Obrigatória para Auditoria *</label>
              <textarea id="paymentsma-f2"
                rows={2}
                required
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ex: Quitação do saldo restante em maquininha presencial no estúdio."
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setAuditModalBooking(null)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submitting}>
                Registrar Auditoria
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};