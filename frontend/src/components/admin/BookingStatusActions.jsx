import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../common/UI';
import { getBookingActions } from '../../utils/bookingStatus';

/**
 * Botões de mudança de status que respeitam a máquina de estados do servidor.
 * Ações que exigem motivo abrem um modal próprio (substitui window.prompt).
 */
export const BookingStatusActions = ({ booking, role, onChange, busy = false, size = 'sm' }) => {
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const actions = getBookingActions(booking, role);

  if (actions.length === 0) return null;

  const run = (action, reasonText) => onChange(booking.id, action.status, reasonText);

  const handleClick = (action) => {
    if (action.reasonMode === 'none') {
      run(action);
      return;
    }
    setReason('');
    setPending(action);
  };

  const trimmed = reason.trim();
  const reasonInvalid = pending?.reasonMode === 'required' && trimmed.length < 5;

  const submit = async (e) => {
    e.preventDefault();
    if (reasonInvalid) return;
    const action = pending;
    setPending(null);
    await run(action, trimmed || action.defaultReason);
  };

  return (
    <>
      {actions.map((a) => (
        <Button key={a.key} size={size} variant={a.variant} disabled={busy} onClick={() => handleClick(a)}>
          {a.key === 'approve' && <Check className="w-4 h-4" aria-hidden="true" />}
          {a.label}
        </Button>
      ))}

      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-espresso-950/60 backdrop-blur-sm p-4 text-left whitespace-normal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-reason-title"
        >
          <form onSubmit={submit} className="bg-white border border-nude-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-lifted">
            <h3 id="status-reason-title" className="font-serif text-2xl font-semibold text-espresso-900">
              {pending.reasonTitle} #{booking.code}
            </h3>
            {pending.reasonHint && <p className="text-small text-nude-700">{pending.reasonHint}</p>}
            <div>
              <label htmlFor="status-reason" className="label-field">
                Motivo {pending.reasonMode === 'required' ? '*' : '(opcional)'}
              </label>
              <textarea
                id="status-reason"
                autoFocus
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field"
                aria-invalid={reasonInvalid && reason.length > 0}
              />
              {pending.reasonMode === 'required' && reasonInvalid && (
                <p className="text-caption text-rose-600 font-medium mt-1.5" role="alert">
                  Informe ao menos 5 caracteres.
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPending(null)}>Voltar</Button>
              <Button type="submit" variant={pending.variant === 'danger' ? 'danger' : 'primary'} disabled={reasonInvalid}>
                Confirmar
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
