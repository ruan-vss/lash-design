import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, Info, CalendarRange } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { dashboardService } from '../../services/dashboardService';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { Button, LoadingState, ErrorState } from '../../components/common/UI';

const getInitialRange = () => {
  const today = new Date();
  return {
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
};

export const ReportsPage = () => {
  const initialRange = getInitialRange();
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getReports(appliedRange);
      setReport(data.report || {});
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appliedRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      toast.error('Informe a data inicial e a data final.');
      return;
    }
    if (endDate < startDate) {
      toast.error('A data final deve ser igual ou posterior à inicial.');
      return;
    }
    setAppliedRange({ startDate, endDate });
  };

  const handleExport = async () => {
    try {
      const blob = await dashboardService.exportReportCsv(appliedRange);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'relatorio-consolidado.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Relatórios</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">Relatórios</h1>
          <p className="text-small text-nude-700">Veja os principais números do estúdio por período.</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3 flex-1 max-w-2xl">
            <label className="block">
              <span className="label-field">Data inicial</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field tabular-nums"
              />
            </label>
            <span className="hidden sm:block text-caption font-medium text-nude-500 pb-3">até</span>
            <label className="block">
              <span className="label-field">Data final</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field tabular-nums"
              />
            </label>
          </div>
          <Button onClick={handleFilter}>
            <CalendarRange className="w-4 h-4" /> Aplicar período
          </Button>
        </div>
      </div>

      <details className="bg-white border border-nude-200 rounded-xl px-4 py-3 text-caption text-nude-700">
        <summary className="cursor-pointer font-semibold text-espresso-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-nude-600" /> Como os indicadores são calculados
        </summary>
        <ul className="list-disc pl-5 mt-3 space-y-1.5 leading-relaxed">
          <li><strong>Receita concluída:</strong> valor dos atendimentos concluídos no período.</li>
          <li><strong>Caixa recebido:</strong> sinais e quitações efetivamente registradas.</li>
          <li><strong>Saldo pendente:</strong> valores que ainda faltam receber das reservas confirmadas.</li>
        </ul>
      </details>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReport} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Receita concluída</span>
            <p className="kpi-value mt-2">{formatCurrency(report?.completedRevenue)}</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Caixa recebido</span>
            <p className="kpi-value text-emerald-700 mt-2">{formatCurrency(report?.cashReceived)}</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Saldo pendente</span>
            <p className="kpi-value text-amber-700 mt-2">{formatCurrency(report?.pendingBalances)}</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Ocupação da agenda</span>
            <p className="kpi-value mt-2">{report?.occupancyRate || 0}%</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Sinais recebidos</span>
            <p className="kpi-value text-emerald-700 mt-2">{formatCurrency(report?.depositsCollected)}</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Clientes recorrentes</span>
            <p className="kpi-value mt-2">{report?.recurringClientsCount || 0}</p>
          </div>
          <div className="card p-5">
            <span className="text-caption font-medium text-nude-600">Cancelamentos e faltas</span>
            <p className="kpi-value text-rose-500 mt-2">{(report?.cancelledCount || 0) + (report?.noShowCount || 0)}</p>
          </div>
          <div className="card p-5 sm:col-span-2 xl:col-span-1">
            <span className="text-caption font-medium text-nude-600">Serviços mais realizados</span>
            <div className="mt-3 space-y-2 text-caption">
              {(report?.topServices || []).length === 0 ? (
                <p className="text-nude-600">Sem atendimentos concluídos no período.</p>
              ) : (report.topServices || []).slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 border-b border-nude-100 pb-2 last:border-0">
                  <span className="font-semibold text-espresso-900 truncate">{item.name}</span>
                  <span className="tabular-nums text-nude-600 whitespace-nowrap">{item.count} atend.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
