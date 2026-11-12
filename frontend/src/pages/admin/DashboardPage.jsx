import { useEffect, useState, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { CalendarCheck, Clock, AlertTriangle, Wallet, TrendingUp, UserCheck } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { LoadingState, ErrorState, StatusBadge } from '../../components/common/UI';

export const DashboardPage = () => {
  const [period, setPeriod] = useState('MONTH'); // TODAY | WEEK | MONTH | LAST_MONTH | CUSTOM
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = period === 'CUSTOM' ? { period, startDate, endDate } : { period };
      const response = await dashboardService.getOverview(params);
      setData(response);
    } catch (err) {
      setError(extractErrorMessage(err, 'Não foi possível carregar os indicadores do dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = data?.metrics || {};
  const charts = data?.charts || {};
  const lists = data?.lists || {};

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Visão geral
          </h1>
          <p className="text-small text-nude-700">
            Acompanhe agenda, recebimentos e pendências do estúdio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-nude-100/80 border border-nude-200 p-1.5 rounded-2xl w-fit">
          {[
            { id: 'TODAY', label: 'Hoje' },
            { id: 'WEEK', label: 'Semana' },
            { id: 'MONTH', label: 'Mês Atual' },
            { id: 'LAST_MONTH', label: 'Mês Anterior' },
            { id: 'CUSTOM', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all ${
                period === p.id
                  ? 'bg-espresso-900 text-nude-50 shadow-sm'
                  : 'text-nude-800 hover:text-espresso-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'CUSTOM' && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field max-w-[180px] tabular-nums"
          />
          <span className="text-caption font-semibold text-nude-600">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field max-w-[180px] tabular-nums"
          />
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <>
          {/* Indicadores Financeiros Auditáveis (Estilo CentraCart) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="card p-6 space-y-2">
              <div className="flex items-center justify-between text-caption font-semibold uppercase tracking-wider text-nude-600">
                <span>Receita concluída</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="kpi-value">{formatCurrency(metrics.completedServicesRevenue)}</p>
              <span className="text-caption text-nude-600 block tabular-nums">
                Ticket Médio: <strong className="text-espresso-900">{formatCurrency(metrics.averageTicket)}</strong>
              </span>
            </div>

            <div className="card p-6 space-y-2">
              <div className="flex items-center justify-between text-caption font-semibold uppercase tracking-wider text-nude-600">
                <span>Recebido</span>
                <div className="w-8 h-8 rounded-xl bg-nude-100 text-nude-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="kpi-value text-emerald-700">
                {formatCurrency(metrics.actuallyReceivedTotal)}
              </p>
              <span className="text-caption text-nude-600 block tabular-nums">
                Sinais recebidos: <strong className="text-espresso-900">{formatCurrency(metrics.depositsReceived)}</strong>
              </span>
            </div>

            <div className="card p-6 space-y-2">
              <div className="flex items-center justify-between text-caption font-semibold uppercase tracking-wider text-nude-600">
                <span>A receber</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="kpi-value">{formatCurrency(metrics.remainingBalanceToReceive)}</p>
              <span className="text-caption text-nude-600 block">
                Valor restante das reservas pendentes e confirmadas
              </span>
            </div>

            <div className="card p-6 space-y-2">
              <div className="flex items-center justify-between text-caption font-semibold uppercase tracking-wider text-nude-600">
                <span>Comparecimento</span>
                <div className="w-8 h-8 rounded-xl bg-nude-100 text-nude-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="kpi-value">{metrics.attendanceRate || 0}%</p>
              <span className="text-caption text-rose-600 font-medium block tabular-nums">
                Cancelamentos: {metrics.cancellationRate || 0}% ({metrics.cancelledCount || 0}) | Faltas:{' '}
                {metrics.noShowCount || 0}
              </span>
            </div>
          </div>

          {/* Indicadores Operacionais da Agenda */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: 'Hoje', value: metrics.todayBookings || 0 },
              { label: 'No período', value: metrics.monthBookings || 0 },
              { label: 'Aguardando aprovação', value: metrics.pendingApprovalCount || 0 },
              { label: 'Confirmados', value: metrics.confirmedCount || 0 },
              { label: 'Concluídos', value: metrics.completedCount || 0 },
              { label: 'Mais procurado', value: metrics.topServiceName || '-' },
            ].map((item, idx) => (
              <div key={idx} className="bg-nude-100/70 border border-nude-200 rounded-2xl p-4">
                <span className="text-caption text-nude-700 font-medium block">{item.label}</span>
                <strong className="text-h4 font-bold text-espresso-900 truncate block mt-1 tabular-nums">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          {/* Gráficos Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-body font-bold text-espresso-900 mb-5">
                Receita concluída por período
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.revenueByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#525252' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#525252' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161616',
                        borderColor: '#393939',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Receita concluída"
                      stroke="#0f62fe"
                      strokeWidth={2}
                      fill="#e0e0e0"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-body font-bold text-espresso-900 mb-5">
                Serviços mais procurados
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.topServices || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#525252' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#525252' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161616',
                        borderColor: '#393939',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Agendamentos" fill="#0f62fe" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Listas Rápidas Operacionais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <h3 className="text-small font-bold uppercase tracking-wider text-espresso-900 mb-4 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-nude-600" /> Próximos Atendimentos
              </h3>
              <div className="space-y-3.5 text-small">
                {(lists.upcomingBookings || []).length === 0 ? (
                  <p className="text-nude-600 text-caption">Nenhum atendimento próximo.</p>
                ) : (
                  lists.upcomingBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 border-b border-nude-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <strong className="text-espresso-900 block font-semibold">{b.clientName}</strong>
                        <span className="text-caption text-nude-600">{b.serviceNames}</span>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="block text-caption font-bold tabular-nums">
                          {formatDate(b.date)} {b.startTime}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-small font-bold uppercase tracking-wider text-espresso-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> Solicitações e Sinais Pendentes
              </h3>
              <div className="space-y-3.5 text-small">
                {(lists.pendingActions || []).length === 0 ? (
                  <p className="text-nude-600 text-caption">Nenhuma pendência no momento.</p>
                ) : (
                  lists.pendingActions.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 border-b border-nude-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <strong className="text-espresso-900 block font-semibold">{b.clientName}</strong>
                        <span className="text-caption text-nude-600 tabular-nums">
                          Sinal: {formatCurrency(b.depositAmount)}
                        </span>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-small font-bold uppercase tracking-wider text-espresso-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Alertas Operacionais
              </h3>
              <div className="space-y-2.5 text-caption">
                {(lists.systemAlerts || []).length === 0 ? (
                  <p className="text-nude-600">Nenhum alerta operacional registrado.</p>
                ) : (
                  lists.systemAlerts.map((al, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium"
                    >
                      {al.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};