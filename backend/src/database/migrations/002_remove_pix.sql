-- Migração 002: remoção do pagamento via Pix e da reserva temporária.
-- Preserva as transações antigas com payment_method = 'PIX' como histórico financeiro.

-- Reservas que aguardavam pagamento ou expiraram deixam de existir como estados
UPDATE bookings
   SET status = 'CANCELLED',
       cancellation_reason = COALESCE(cancellation_reason, 'Encerrada: pagamento online descontinuado'),
       updated_at = NOW()
 WHERE status IN ('PENDING_PAYMENT', 'EXPIRED');

-- Cobranças Pix que nunca foram pagas
UPDATE payment_transactions
   SET status = 'CANCELLED'
 WHERE payment_method = 'PIX' AND status = 'PENDING';

ALTER TABLE bookings
  DROP COLUMN IF EXISTS pix_qr_code_base64,
  DROP COLUMN IF EXISTS pix_copy_paste,
  DROP COLUMN IF EXISTS expires_at;

ALTER TABLE payment_transactions DROP COLUMN IF EXISTS gateway_transaction_id;
ALTER TABLE studio_settings DROP COLUMN IF EXISTS temp_reservation_minutes;

UPDATE studio_settings SET confirmation_mode = 'ADMIN_APPROVAL';
ALTER TABLE studio_settings ALTER COLUMN confirmation_mode SET DEFAULT 'ADMIN_APPROVAL';
