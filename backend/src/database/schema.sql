CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Usuários Administrativos / Equipe
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'ADMIN', -- ADMIN | PROFESSIONAL | RECEPTIONIST
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Configurações Gerais do Estúdio (Registro Único)
CREATE TABLE IF NOT EXISTS studio_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  studio_name VARCHAR(150) NOT NULL DEFAULT 'Atelier Lash Designer',
  description TEXT NOT NULL DEFAULT 'Especialista em extensão de cílios com foco em naturalidade e saúde ocular.',
  professional_name VARCHAR(150) NOT NULL DEFAULT 'Especialista Lash',
  professional_bio TEXT NOT NULL DEFAULT 'Certificada em técnicas avançadas de acoplagem e visagismo do olhar.',
  phone VARCHAR(30) DEFAULT '',
  whatsapp VARCHAR(30) DEFAULT '',
  address TEXT DEFAULT 'Endereço configurável no painel',
  opening_hours_text VARCHAR(200) DEFAULT 'Terça a Sábado, mediante agendamento',
  confirmation_mode VARCHAR(30) NOT NULL DEFAULT 'ADMIN_APPROVAL', -- sempre ADMIN_APPROVAL (sem pagamento online)
  cancellation_policy_text TEXT NOT NULL DEFAULT 'Cancelamentos ou reagendamentos devem respeitar o prazo mínimo de 24 horas de antecedência.',
  allow_multiple_services BOOLEAN NOT NULL DEFAULT TRUE,
  allow_client_reschedule BOOLEAN NOT NULL DEFAULT TRUE,
  timezone VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
  prep_minutes INT NOT NULL DEFAULT 15,
  min_advance_hours INT NOT NULL DEFAULT 2,
  max_advance_days INT NOT NULL DEFAULT 60,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_templates JSONB NOT NULL DEFAULT '{
    "confirmation": "Olá {{cliente}}, seu horário para {{servico}} em {{data}} às {{hora}} foi confirmado!",
    "reminder": "Lembrete: Seu atendimento de {{servico}} acontece amanhã às {{hora}}.",
    "preCare": "Orientações: Compareça sem rímel ou maquiagem na região dos olhos.",
    "cancellation": "Sua reserva #{{codigo}} foi cancelada.",
    "reschedule": "Sua reserva #{{codigo}} foi reagendada para {{data}} às {{hora}}."
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Expediente Semanal
CREATE TABLE IF NOT EXISTS working_hours (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  label VARCHAR(40) NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  open_time VARCHAR(5) NOT NULL DEFAULT '09:00',
  close_time VARCHAR(5) NOT NULL DEFAULT '19:00',
  break_start VARCHAR(5) NOT NULL DEFAULT '12:00',
  break_end VARCHAR(5) NOT NULL DEFAULT '13:00'
);

-- 4. Bloqueios, Férias e Feriados
CREATE TABLE IF NOT EXISTS schedule_blockings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time VARCHAR(5),
  end_time VARCHAR(5),
  reason VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Catálogo de Serviços (Com Soft Delete para preservar histórico financeiro)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 15),
  prep_time_minutes INT NOT NULL DEFAULT 15,
  deposit_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- PERCENTAGE | FIXED | NONE
  deposit_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  guidelines TEXT,
  maintenance_rules TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(150),
  internal_notes TEXT DEFAULT '',
  whatsapp_consent BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Cupons e Promoções
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE | FIXED
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  valid_until DATE NOT NULL,
  max_uses INT NOT NULL DEFAULT 50,
  used_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Reservas / Agendamentos
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  booking_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  total_duration_minutes INT NOT NULL,
  subtotal_price NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  coupon_code_snapshot VARCHAR(40),
  total_price NUMERIC(10, 2) NOT NULL,
  deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deposit_paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  final_paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL, -- PENDING_APPROVAL | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
  client_notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Itens da Reserva (Congela o preço oficial do momento da contratação)
CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_name_snapshot VARCHAR(150) NOT NULL,
  price_snapshot NUMERIC(10, 2) NOT NULL,
  duration_minutes_snapshot INT NOT NULL
);

-- 10. Transações Financeiras e Auditoria
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  transaction_type VARCHAR(30) NOT NULL, -- DEPOSIT | BALANCE_SETTLEMENT | AUDIT_ADJUSTMENT
  payment_method VARCHAR(30) NOT NULL, -- CASH | CREDIT_CARD | ADMIN_AUDIT; métodos legados podem existir apenas em históricos
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | REFUNDED | CANCELLED
  audit_reason TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Histórico de Envios de WhatsApp
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  type VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- SENT | DELIVERED | READ | FAILED
  attempts INT NOT NULL DEFAULT 1,
  error_detail TEXT,
  provider_message_id VARCHAR(255),
  event_key VARCHAR(255),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_logs_event_key
  ON notification_logs(event_key) WHERE event_key IS NOT NULL;