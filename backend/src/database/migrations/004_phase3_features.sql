-- Fase 3: cupons auditáveis e índices para paginação/relatórios.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code_snapshot VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_date ON bookings(client_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients(full_name);
CREATE INDEX IF NOT EXISTS idx_promotions_code_active ON promotions(UPPER(code), active);
