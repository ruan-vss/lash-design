import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { extractErrorMessage } from '../../services/api';
import { Button, LoadingState } from '../../components/common/UI';

const DAYS_OF_WEEK = [
  { day: 0, label: 'Domingo' },
  { day: 1, label: 'Segunda-feira' },
  { day: 2, label: 'Terça-feira' },
  { day: 3, label: 'Quarta-feira' },
  { day: 4, label: 'Quinta-feira' },
  { day: 5, label: 'Sexta-feira' },
  { day: 6, label: 'Sábado' },
];

export const AvailabilityPage = () => {
  const [schedule, setSchedule] = useState(
    DAYS_OF_WEEK.map((d) => ({
      dayOfWeek: d.day,
      label: d.label,
      isOpen: d.day >= 2 && d.day <= 6,
      openTime: '09:00',
      closeTime: '19:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    }))
  );
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.getWorkingHours();
        if (data.schedule) setSchedule(data.schedule);
        if (data.prepMinutes !== undefined) setPrepMinutes(data.prepMinutes);
        if (data.minAdvanceHours !== undefined) setMinAdvanceHours(data.minAdvanceHours);
        if (data.maxAdvanceDays !== undefined) setMaxAdvanceDays(data.maxAdvanceDays);
      } catch {
        // Mantém padrão inicial
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsService.updateWorkingHours({
        schedule,
        prepMinutes,
        minAdvanceHours,
        maxAdvanceDays,
      });
      setConflicts(res.conflictingBookings || []);
      toast.success('Expediente salvo! As reservas já confirmadas foram preservadas.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <form onSubmit={handleSaveHours} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Regras de Agenda</span>
          <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
            Expediente
          </h1>
          <p className="text-small text-nude-700">
            Defina os dias e horários em que o estúdio atende.
          </p>
        </div>
        <Button type="submit" isLoading={saving}>
          Salvar expediente
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-caption text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Atenção: {conflicts.length} agendamento(s) existente(s) ficaram fora do novo horário de expediente (preservados):
          </div>
          <ul className="list-disc pl-5 tabular-nums">
            {conflicts.map((c) => (
              <li key={c.id}>
                #{c.code} - {c.clientName} em {c.date} às {c.startTime}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 card p-6">
        <div>
          <label htmlFor="availabili-f1" className="label-field">Preparação entre clientes (min)</label>
          <input id="availabili-f1"
            type="number"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(Number(e.target.value))}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f2" className="label-field">Antecedência mínima (horas)</label>
          <input id="availabili-f2"
            type="number"
            value={minAdvanceHours}
            onChange={(e) => setMinAdvanceHours(Number(e.target.value))}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f3" className="label-field">Antecedência máxima (dias)</label>
          <input id="availabili-f3"
            type="number"
            value={maxAdvanceDays}
            onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
            className="input-field tabular-nums"
          />
        </div>
      </div>

      <div className="card divide-y divide-nude-100">
        {schedule.map((item, idx) => (
          <div
            key={item.dayOfWeek}
            className="p-5 flex flex-wrap items-center justify-between gap-4 text-small"
          >
            <label className="flex items-center gap-3 font-semibold min-w-[160px] cursor-pointer">
              <input
                type="checkbox"
                checked={item.isOpen}
                onChange={(e) => {
                  const next = [...schedule];
                  next[idx].isOpen = e.target.checked;
                  setSchedule(next);
                }}
                className="w-4 h-4 rounded border-nude-400 text-nude-600 focus:ring-nude-500"
              />
              {item.label}
            </label>

            {item.isOpen ? (
              <div className="flex flex-wrap items-center gap-3 text-caption font-medium tabular-nums">
                <span>Abertura:</span>
                <input
                  type="time"
                  value={item.openTime}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx].openTime = e.target.value;
                    setSchedule(next);
                  }}
                  className="input-field w-auto py-1.5"
                />
                <span>Fechamento:</span>
                <input
                  type="time"
                  value={item.closeTime}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx].closeTime = e.target.value;
                    setSchedule(next);
                  }}
                  className="input-field w-auto py-1.5"
                />
                <span>Intervalo:</span>
                <input
                  type="time"
                  value={item.breakStart}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx].breakStart = e.target.value;
                    setSchedule(next);
                  }}
                  className="input-field w-auto py-1.5"
                />
                <span>até</span>
                <input
                  type="time"
                  value={item.breakEnd}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[idx].breakEnd = e.target.value;
                    setSchedule(next);
                  }}
                  className="input-field w-auto py-1.5"
                />
              </div>
            ) : (
              <span className="text-caption text-nude-500 italic">Fechado / Folga</span>
            )}
          </div>
        ))}
      </div>
    </form>
  );
};

export const BlockingsPage = () => {
  const [blockings, setBlockings] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBlockings = async () => {
    try {
      const data = await settingsService.getBlockings();
      setBlockings(data.blockings || []);
    } catch {
      // Silencioso no carregamento inicial
    }
  };

  useEffect(() => {
    loadBlockings();
  }, []);

  const handleAddBlocking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await settingsService.createBlocking({ startDate, endDate, startTime, endTime, reason });
      toast.success('Bloqueio registrado!');
      setReason('');
      setStartTime('');
      setEndTime('');
      loadBlockings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await settingsService.deleteBlocking(id);
      toast.success('Bloqueio removido!');
      loadBlockings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Exceções de Calendário</span>
        <h1 className="font-serif text-h2 sm:text-h1 font-semibold text-espresso-900 mt-1">
          Bloqueios
        </h1>
        <p className="text-small text-nude-700">
          Marque férias, feriados ou horários que não podem receber reservas.
        </p>
      </div>

      <form
        onSubmit={handleAddBlocking}
        className="card p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
      >
        <div>
          <label htmlFor="availabili-f4" className="label-field">Data Inicial *</label>
          <input id="availabili-f4"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f5" className="label-field">Data Final *</label>
          <input id="availabili-f5"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f6" className="label-field">Hora Início (Opc.)</label>
          <input id="availabili-f6"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f7" className="label-field">Hora Fim (Opc.)</label>
          <input id="availabili-f7"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="availabili-f8" className="label-field">Motivo *</label>
          <input id="availabili-f8"
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Férias / Congresso"
            className="input-field"
          />
        </div>
        <Button type="submit" isLoading={submitting} className="w-full">
          <Plus className="w-4 h-4" /> Bloquear
        </Button>
      </form>

      <div className="card divide-y divide-nude-100 text-small">
        {blockings.length === 0 ? (
          <p className="p-8 text-center text-nude-600">Nenhum bloqueio cadastrado.</p>
        ) : (
          blockings.map((b) => (
            <div key={b.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <strong className="text-espresso-900 font-semibold">{b.reason}</strong>
                <span className="block text-caption text-nude-600 tabular-nums mt-0.5">
                  {b.startDate} até {b.endDate}{' '}
                  {b.startTime ? `(${b.startTime} - ${b.endTime || '...'})` : '(Dia Inteiro)'}
                </span>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDelete(b.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};