-- Migração 003: ajustes necessários para os controles críticos da Fase 2.
ALTER TABLE bookings ALTER COLUMN code TYPE VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (booking_date, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions (created_at DESC);
