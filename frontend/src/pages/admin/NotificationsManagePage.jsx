import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send, CheckCircle2, AlertOctagon } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { extractErrorMessage } from '../../services/api';
import { Button, LoadingState } from '../../components/common/UI';

const notificationStatusLabels = {
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  READ: 'Lido',
  FAILED: 'Falhou',
};

export const NotificationsManagePage = () => {
  const [enabled, setEnabled] = useState(true);
  const [integrationConnected, setIntegrationConnected] = useState(false);
  const [templates, setTemplates] = useState({
    confirmation: 'Olá {{cliente}}, seu horário para {{servico}} em {{data}} às {{hora}} foi confirmado!',
    reminder: 'Lembrete: Seu atendimento de {{servico}} acontece amanhã às {{hora}}.',
    preCare: 'Orientações: Compareça sem maquiagem ou rímel nos cílios.',
    cancellation: 'Sua reserva #{{codigo}} foi cancelada conforme solicitado.',
    reschedule: 'Sua reserva #{{codigo}} foi reagendada para {{data}} às {{hora}}.',
  });
  const [logs, setLogs] = useState([]);
  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getSettingsAndLogs();
      setEnabled(Boolean(data.enabled));
      setIntegrationConnected(Boolean(data.integrationConnected));
      if (data.templates) setTemplates(data.templates);
      setLogs(data.logs || []);
    } catch {
      setIntegrationConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await notificationService.updateTemplates({ enabled, templates });
      toast.success('Configurações de mensagens salvas no servidor!');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone) return toast.error('Informe um telefone para teste.');
    try {
      await notificationService.testIntegration(testPhone);
      toast.success('Disparo de teste solicitado ao backend!');
      loadData();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Serviço de WhatsApp desconectado no backend.'));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Comunicação Automatizada</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            WhatsApp
          </h1>
          <p className="text-small text-nude-700">
            Gerencie mensagens automáticas e acompanhe o status dos envios.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-caption font-semibold border ${
            integrationConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {integrationConnected ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> WhatsApp conectado
            </>
          ) : (
            <>
              <AlertOctagon className="w-4 h-4" /> WhatsApp aguardando configuração
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-6 sm:p-8 space-y-6">
        <label className="flex items-center gap-3 text-small font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-nude-400 text-nude-600 focus:ring-nude-500"
          />
          Ativar mensagens automáticas
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="notificati-f1" className="label-field">Mensagem de Confirmação</label>
            <textarea id="notificati-f1"
              rows={2}
              value={templates.confirmation}
              onChange={(e) => setTemplates({ ...templates, confirmation: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="notificati-f2" className="label-field">Lembrete de Atendimento</label>
            <textarea id="notificati-f2"
              rows={2}
              value={templates.reminder}
              onChange={(e) => setTemplates({ ...templates, reminder: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="notificati-f3" className="label-field">Orientações Pré-Atendimento</label>
            <textarea id="notificati-f3"
              rows={2}
              value={templates.preCare}
              onChange={(e) => setTemplates({ ...templates, preCare: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="notificati-f4" className="label-field">Aviso de Cancelamento / Remarcação</label>
            <textarea id="notificati-f4"
              rows={2}
              value={templates.cancellation}
              onChange={(e) => setTemplates({ ...templates, cancellation: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-nude-100">
          <Button type="submit" isLoading={saving}>
            Salvar mensagens
          </Button>
        </div>
      </form>

      <div className="card p-6 sm:p-8 space-y-5">
        <h3 className="text-h4 font-bold text-espresso-900">Enviar mensagem de teste</h3>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="input-field flex-1 tabular-nums"
          />
          <Button variant="secondary" onClick={handleTestSend}>
            <Send className="w-4 h-4" /> Enviar teste
          </Button>
        </div>

        <h4 className="text-caption font-bold uppercase tracking-wider text-nude-600 pt-4">
          Últimos envios
        </h4>
        <div className="divide-y divide-nude-100 text-small">
          {logs.length === 0 ? (
            <p className="text-nude-600 py-3">Nenhum disparo registrado até o momento.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-3 space-y-1 tabular-nums">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span>
                    {log.recipientPhone} — <strong className="text-espresso-900">{log.type}</strong>
                  </span>
                  <span
                    className={
                      ['SENT', 'DELIVERED', 'READ'].includes(log.status)
                        ? 'text-emerald-700 font-semibold'
                        : 'text-rose-600 font-semibold'
                    }
                  >
                    {notificationStatusLabels[log.status] || log.status} · {log.attempts} tentativa(s)
                  </span>
                </div>
                {log.providerMessageId && (
                  <p className="text-caption text-nude-600 break-all">Meta ID: {log.providerMessageId}</p>
                )}
                {log.errorDetail && (
                  <p className="text-caption text-rose-600">{log.errorDetail}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};