-- Fase 4: rastreabilidade e idempotência dos envios reais de WhatsApp
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS event_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_logs_event_key
  ON notification_logs(event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_booking_created
  ON notification_logs(booking_id, created_at DESC);
