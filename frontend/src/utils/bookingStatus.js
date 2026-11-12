// Espelha a máquina de estados do backend (adminBookingController.js).
// O servidor é a autoridade: isto só decide quais botões exibir.
const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Retorna as ações disponíveis para uma reserva.
 * Cada ação: { key, status, label, variant, reasonMode: 'none' | 'optional' | 'required', confirm? }
 */
export const getBookingActions = (booking, role) => {
  if (!booking) return [];
  const isPast = String(booking.date).slice(0, 10) <= todayStr();
  const actions = [];

  switch (booking.status) {
    case 'PENDING_APPROVAL':
      actions.push(
        { key: 'approve', status: 'CONFIRMED', label: 'Aprovar', variant: 'primary', reasonMode: 'none' },
        { key: 'reject', status: 'CANCELLED', label: 'Recusar', variant: 'danger', reasonMode: 'optional', reasonTitle: 'Recusar reserva', defaultReason: 'Recusada pela profissional' }
      );
      break;
    case 'CONFIRMED':
      if (isPast) {
        actions.push(
          { key: 'complete', status: 'COMPLETED', label: 'Concluir', variant: 'primary', reasonMode: 'none' },
          { key: 'noshow', status: 'NO_SHOW', label: 'Registrar falta', variant: 'secondary', reasonMode: 'none' }
        );
      }
      actions.push(
        { key: 'cancel', status: 'CANCELLED', label: 'Cancelar', variant: 'danger', reasonMode: 'optional', reasonTitle: 'Cancelar reserva', defaultReason: 'Cancelada pela profissional' }
      );
      break;
    case 'CANCELLED':
      actions.push(
        { key: 'reactivate', status: 'PENDING_APPROVAL', label: 'Reativar', variant: 'secondary', reasonMode: 'none' }
      );
      break;
    case 'COMPLETED':
    case 'NO_SHOW':
      if (role === 'ADMIN') {
        actions.push({
          key: 'correct',
          status: 'CONFIRMED',
          label: 'Corrigir status',
          variant: 'secondary',
          reasonMode: 'required',
          reasonTitle: 'Corrigir reserva finalizada',
          reasonHint: booking.status === 'COMPLETED'
            ? 'A reserva volta para "Confirmado" e o saldo liquidado é estornado.'
            : 'A reserva volta para "Confirmado".',
        });
      }
      break;
    default:
      break;
  }
  return actions;
};
