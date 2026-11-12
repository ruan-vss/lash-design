import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatDate = (dateString, pattern = 'dd/MM/yyyy') => {
  if (!dateString) return '-';
  const parsed = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  if (!isValid(parsed)) return '-';
  return format(parsed, pattern, { locale: ptBR });
};

export const formatDuration = (minutes) => {
  const mins = Number(minutes);
  if (!mins || mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

export const formatPhone = (value = '') => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const statusBadgeConfig = {
  PENDING_APPROVAL: { label: 'Aguardando Aprovação', classes: 'bg-blue-50 text-blue-800 border-blue-200' },
  CONFIRMED: { label: 'Confirmado', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  COMPLETED: { label: 'Concluído', classes: 'bg-nude-200 text-espresso-900 border-nude-300' },
  CANCELLED: { label: 'Cancelado', classes: 'bg-rose-100 text-rose-500 border-rose-200' },
  NO_SHOW: { label: 'Não Compareceu', classes: 'bg-red-50 text-red-800 border-red-200' },
};