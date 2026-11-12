/**
 * Teste de integração (smoke) contra uma API real + Postgres.
 *
 * Uso (API já em execução, banco já com seed):
 *   API_URL=http://localhost:3001/api/v1 \
 *   ADMIN_EMAIL=admin@lashstudio.com ADMIN_PASSWORD='...' \
 *   DATABASE_URL=postgresql://... node scripts/smoke.mjs
 *
 * ATENÇÃO: cria dados de teste (cliente/reservas/usuário). Rode apenas em banco de teste.
 * O teste de limite de taxa consome a cota de rate-limit do IP; reinicie a API depois.
 */
import pg from 'pg';

const API = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !process.env.DATABASE_URL) {
  console.error('Defina ADMIN_EMAIL, ADMIN_PASSWORD e DATABASE_URL.');
  process.exit(2);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) { passed += 1; console.log(`  ✅ ${name}`); }
  else { failed += 1; console.log(`  ❌ ${name} ${extra}`); }
};

const call = async (method, path, { body, token, query } = {}) => {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const res = await fetch(`${API}${path}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, data };
};

const nextWeekday = (dow, weeksAhead = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + 7 * weeksAhead);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const run = async () => {
  await db.connect();
  const suffix = String(Date.now()).slice(-6);
  const PHONE_VICTIM = `1198${suffix}1`;
  const wed = nextWeekday(3, 2); // quarta-feira, aberta no seed

  console.log('\n[1] Autenticação admin');
  let r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: 'senha-errada-123' } });
  check('login com senha errada → 401', r.status === 401);
  r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('login válido → 200 + token', r.status === 200 && r.data?.token, JSON.stringify(r.data));
  let adminToken = r.data.token;
  if (r.data.user?.mustChangePassword) {
    const newPass = `${ADMIN_PASSWORD}#novo9`;
    const cp = await call('POST', '/auth/change-password', { token: adminToken, body: { currentPassword: ADMIN_PASSWORD, newPassword: newPass } });
    check('troca de senha obrigatória → novo token', cp.status === 200 && cp.data?.token, JSON.stringify(cp.data));
    adminToken = cp.data.token;
  }
  r = await call('POST', '/auth/refresh', { token: adminToken });
  check('refresh de sessão → novo token', r.status === 200 && r.data?.token);
  adminToken = r.data?.token || adminToken;
  r = await call('GET', '/admin/dashboard', {});
  check('rota admin sem token → 401', r.status === 401);

  console.log('\n[2] Perfis (RBAC)');
  const recEmail = `recep${suffix}@teste.com`;
  const recPass = 'Recep#Forte2026x';
  r = await call('POST', '/admin/users', { token: adminToken, body: { name: 'Recepção Teste', email: recEmail, role: 'RECEPTIONIST', password: recPass } });
  check('ADMIN cria recepcionista', r.status === 201, JSON.stringify(r.data));
  r = await call('POST', '/auth/login', { body: { email: recEmail, password: recPass } });
  const recToken = r.data?.token;
  r = await call('GET', '/admin/users', { token: recToken });
  check('RECEPTIONIST não lista usuários → 403', r.status === 403);
  r = await call('GET', '/admin/reports', { token: recToken });
  check('RECEPTIONIST não acessa relatórios → 403', r.status === 403);

  console.log('\n[3] Reserva pública');
  const { rows: svc } = await db.query("SELECT id FROM services WHERE active = TRUE AND deleted_at IS NULL ORDER BY price ASC LIMIT 1");
  const serviceId = svc[0]?.id;
  check('existe serviço ativo no seed', Boolean(serviceId));
  r = await call('GET', '/public/availability/slots', { query: { date: wed, serviceIds: serviceId } });
  const slots = r.data?.slots || [];
  check('slots disponíveis na quarta', r.status === 200 && slots.length >= 6, JSON.stringify(r.data));
  r = await call('GET', '/public/availability/slots', { query: { date: wed, serviceIds: "1' OR '1'='1" } });
  check('serviceIds inválido (injeção) → 400', r.status === 400);
  r = await call('GET', '/public/availability/slots', { query: { date: '2026-02-31', serviceIds: serviceId } });
  check('data inexistente → 400', r.status === 400);

  const book = (slot, phone, name, consent = false) => call('POST', '/public/bookings', {
    body: { serviceIds: [serviceId], date: wed, startTime: slot, client: { fullName: name, phone, whatsappConsent: consent } },
  });
  const victim = await book(slots[0], PHONE_VICTIM, 'Vitima Original', false);
  check('cliente (vítima) cria reserva → 201', victim.status === 201, JSON.stringify(victim.data));
  const victimBooking = victim.data.booking;

  console.log('\n[4] Ataque: usar o telefone da vítima');
  const attacker = await book(slots[2], PHONE_VICTIM, 'Atacante Falso', true);
  check('atacante cria reserva com telefone da vítima', attacker.status === 201, JSON.stringify(attacker.data));
  const { rows: cl } = await db.query('SELECT full_name, whatsapp_consent FROM clients WHERE phone = $1', [PHONE_VICTIM]);
  check('nome da vítima NÃO foi sobrescrito', cl[0]?.full_name === 'Vitima Original', JSON.stringify(cl[0]));
  check('consentimento WhatsApp NÃO foi alterado', cl[0]?.whatsapp_consent === false, JSON.stringify(cl[0]));
  r = await call('POST', '/public/bookings/lookup', { body: { bookingCode: attacker.data.booking.code, phone: PHONE_VICTIM } });
  check('lookup devolve só 1 reserva (a do código)', r.status === 200 && r.data.bookings.length === 1 && r.data.bookings[0].code === attacker.data.booking.code, JSON.stringify(r.data?.bookings?.length));
  const lookupToken = r.data?.accessToken;
  r = await call('GET', `/public/bookings/${victimBooking.id}`, { query: { token: lookupToken } });
  check('token do atacante NÃO abre reserva da vítima → 403', r.status === 403, `status ${r.status}`);
  r = await call('POST', `/public/bookings/${victimBooking.id}/cancel`, { body: { token: lookupToken } });
  check('atacante NÃO cancela reserva da vítima → 403', r.status === 403, `status ${r.status}`);
  r = await call('GET', `/public/bookings/${victimBooking.id}`, { query: { token: victimBooking.accessToken } });
  check('dona legítima abre a própria reserva → 200', r.status === 200);

  console.log('\n[5] Limite de pendentes por telefone');
  const third = await book(slots[4], PHONE_VICTIM, 'Vitima Original');
  const fourth = await book(slots[6] || slots[5], PHONE_VICTIM, 'Vitima Original');
  check('3ª solicitação pendente aceita', third.status === 201, JSON.stringify(third.data));
  check('4ª solicitação pendente → 429', fourth.status === 429, `status ${fourth.status}`);

  console.log('\n[6] Cancelamento / reagendamento pela cliente');
  const free = await call('GET', '/public/availability/slots', { query: { date: wed, serviceIds: serviceId } });
  const newSlot = (free.data?.slots || [])[0];
  r = await call('POST', `/public/bookings/${victimBooking.id}/reschedule`, { body: { token: victimBooking.accessToken, newDate: wed, newStartTime: newSlot } });
  check('reagendar para horário livre → 200', r.status === 200, JSON.stringify(r.data));
  r = await call('POST', `/public/bookings/${victimBooking.id}/cancel`, { body: { token: victimBooking.accessToken } });
  check('cancelar a própria reserva → 200', r.status === 200 && r.data.booking.status === 'CANCELLED', JSON.stringify(r.data));
  r = await call('POST', `/public/bookings/${victimBooking.id}/cancel`, { body: { token: victimBooking.accessToken } });
  check('cancelar de novo → 409', r.status === 409);
  r = await call('POST', `/public/bookings/${victimBooking.id}/reschedule`, { body: { token: victimBooking.accessToken, newDate: wed, newStartTime: newSlot } });
  check('reagendar reserva cancelada → 409', r.status === 409, `status ${r.status}`);

  console.log('\n[7] Máquina de estados (admin)');
  const target = third.data.booking; // PENDING_APPROVAL
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: recToken, body: { status: 'COMPLETED' } });
  check('PENDING → COMPLETED bloqueado → 409', r.status === 409, `status ${r.status}`);
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: recToken, body: { status: 'CONFIRMED' } });
  check('PENDING → CONFIRMED → 200', r.status === 200, JSON.stringify(r.data));
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: recToken, body: { status: 'COMPLETED' } });
  check('concluir reserva de data futura → 409', r.status === 409, `status ${r.status}`);
  await db.query("UPDATE bookings SET booking_date = CURRENT_DATE - 1 WHERE id = $1", [target.id]);
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: recToken, body: { status: 'COMPLETED' } });
  check('CONFIRMED → COMPLETED (data passada) → 200', r.status === 200 && r.data.booking.status === 'COMPLETED', JSON.stringify(r.data));
  const settled = Number(r.data?.booking?.final_paid_amount);
  check('saldo liquidado registrado', settled > 0, String(settled));
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: recToken, body: { status: 'CONFIRMED', reason: 'tentativa recepção' } });
  check('RECEPTIONIST não corrige reserva concluída → 403', r.status === 403, `status ${r.status}`);
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: adminToken, body: { status: 'CONFIRMED' } });
  check('ADMIN sem justificativa → 400', r.status === 400, `status ${r.status}`);
  r = await call('PATCH', `/admin/bookings/${target.id}/status`, { token: adminToken, body: { status: 'CONFIRMED', reason: 'Marcada por engano' } });
  check('ADMIN corrige COMPLETED → CONFIRMED → 200', r.status === 200 && r.data.booking.status === 'CONFIRMED', JSON.stringify(r.data));
  check('saldo estornado (final_paid zerado)', Number(r.data?.booking?.final_paid_amount) === 0, String(r.data?.booking?.final_paid_amount));
  const { rows: tx } = await db.query("SELECT status FROM payment_transactions WHERE booking_id = $1 AND transaction_type = 'BALANCE_SETTLEMENT'", [target.id]);
  check('transação de saldo marcada REFUNDED', tx.length === 1 && tx[0].status === 'REFUNDED', JSON.stringify(tx));
  r = await call('PATCH', `/admin/bookings/${victimBooking.id}/status`, { token: adminToken, body: { status: 'COMPLETED' } });
  check('CANCELLED → COMPLETED bloqueado → 409', r.status === 409, `status ${r.status}`);

  console.log('\n[8] Webhook do WhatsApp');
  r = await call('POST', '/webhooks/whatsapp', { body: { entry: [] } });
  check('POST sem app secret configurado → 503 (fail-closed)', r.status === 503, `status ${r.status}`);

  console.log('\n[9] Limite de taxa (consulta por código)');
  let got429 = false;
  for (let i = 0; i < 40 && !got429; i += 1) {
    const x = await call('POST', '/public/bookings/lookup', { body: { bookingCode: 'LASH-NAOEXISTE0000', phone: '11999990000' } });
    if (x.status === 429) got429 = true;
  }
  check('tentativas excessivas de lookup → 429', got429);

  console.log(`\nResultado: ${passed} ok, ${failed} falhas`);
  await db.end();
  process.exit(failed ? 1 : 0);
};

run().catch(async (e) => { console.error(e); try { await db.end(); } catch { /* */ } process.exit(1); });
