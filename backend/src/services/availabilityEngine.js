import { query } from '../config/database.js';
import { timeToMinutes, minutesToTime, hasTimeOverlap } from '../utils/timeUtils.js';

export const availabilityEngine = {
  /**
   * Calcula duração oficial, preços e sinal a partir do banco de dados
   */
  calculateOfficialTotals: async (serviceIds, couponCode, dbClient = { query }) => {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      const err = new Error('Selecione ao menos um serviço válido.');
      err.statusCode = 400;
      throw err;
    }

    const { rows: services } = await dbClient.query(
      `SELECT id, name, price, duration_minutes, prep_time_minutes, deposit_type, deposit_value, guidelines
       FROM services
       WHERE id = ANY($1::uuid[]) AND active = TRUE AND deleted_at IS NULL`,
      [serviceIds]
    );

    if (services.length !== serviceIds.length) {
      const err = new Error('Um ou mais serviços selecionados estão indisponíveis.');
      err.statusCode = 400;
      throw err;
    }

    const { rows: settingsRows } = await dbClient.query('SELECT * FROM studio_settings WHERE id = 1');
    const settings = settingsRows[0];

    if (!settings.allow_multiple_services && services.length > 1) {
      const err = new Error('A política atual do estúdio permite agendar apenas 1 serviço por vez.');
      err.statusCode = 400;
      throw err;
    }

    let subtotalPrice = 0;
    let totalDurationMinutes = 0;
    let maxPrepMinutes = settings.prep_minutes || 15;
    let rawDeposit = 0;

    for (const s of services) {
      const priceNum = Number(s.price);
      subtotalPrice += priceNum;
      totalDurationMinutes += Number(s.duration_minutes);
      if (Number(s.prep_time_minutes) > maxPrepMinutes) {
        maxPrepMinutes = Number(s.prep_time_minutes);
      }

      if (s.deposit_type === 'PERCENTAGE') {
        rawDeposit += priceNum * (Number(s.deposit_value) / 100);
      } else if (s.deposit_type === 'FIXED') {
        rawDeposit += Number(s.deposit_value);
      }
    }

    let discountAmount = 0;
    let promotion = null;
    if (couponCode) {
      const normalizedCoupon = String(couponCode).trim().toUpperCase();
      const { rows: promos } = await dbClient.query(
        `SELECT * FROM promotions
         WHERE UPPER(code) = $1
           AND active = TRUE
           AND valid_until >= CURRENT_DATE
           AND used_count < max_uses
         FOR UPDATE`,
        [normalizedCoupon]
      );
      if (promos.length === 0) {
        const err = new Error('Cupom inválido, expirado ou com limite de usos atingido.');
        err.statusCode = 400;
        throw err;
      }
      promotion = promos[0];
      discountAmount =
        promotion.discount_type === 'PERCENTAGE'
          ? subtotalPrice * (Number(promotion.discount_value) / 100)
          : Number(promotion.discount_value);
      discountAmount = Math.min(subtotalPrice, discountAmount);
    }

    const totalPrice = Math.max(0, Number((subtotalPrice - discountAmount).toFixed(2)));
    const depositAmount = Math.min(totalPrice, Number(rawDeposit.toFixed(2)));
    const remainingBalance = Number((totalPrice - depositAmount).toFixed(2));

    return {
      services,
      settings,
      subtotalPrice: Number(subtotalPrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      totalPrice,
      depositAmount,
      remainingBalance,
      totalDurationMinutes,
      prepMinutes: maxPrepMinutes,
      promotion: promotion ? { id: promotion.id, code: promotion.code } : null,
    };
  },

  /**
   * Retorna lista de horários ("09:00", "09:30", ...) realmente disponíveis para uma data
   */
  getAvailableSlotsForDate: async (dateStr, serviceIds, dbClient = { query }, options = {}) => {
    const calc = await availabilityEngine.calculateOfficialTotals(serviceIds, null, dbClient);
    const totalOccupiedMinutes = calc.totalDurationMinutes + calc.prepMinutes;

    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    const { rows: whRows } = await dbClient.query(
      'SELECT * FROM working_hours WHERE day_of_week = $1',
      [dayOfWeek]
    );
    if (whRows.length === 0 || !whRows[0].is_open) return [];
    const wh = whRows[0];

    // Verifica bloqueios de dia inteiro ou parciais
    const { rows: blockings } = await dbClient.query(
      `SELECT * FROM schedule_blockings
       WHERE $1::date BETWEEN start_date AND end_date`,
      [dateStr]
    );
    if (blockings.some((b) => !b.start_time || !b.end_time)) {
      return [];
    }

    // Busca agendamentos ativos daquele dia
    const { rows: existingBookings } = await dbClient.query(
      `SELECT start_time, end_time
       FROM bookings
       WHERE booking_date = $1::date
         AND status IN ('CONFIRMED', 'PENDING_APPROVAL', 'COMPLETED')
         AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      [dateStr, options.excludeBookingId || null]
    );

    const openMin = timeToMinutes(wh.open_time);
    const closeMin = timeToMinutes(wh.close_time);
    const breakStartMin = wh.break_start ? timeToMinutes(wh.break_start) : null;
    const breakEndMin = wh.break_end ? timeToMinutes(wh.break_end) : null;

    const now = new Date();
    const minAdvanceMs = (calc.settings.min_advance_hours || 2) * 60 * 60 * 1000;

    const slots = [];
    const stepMinutes = 30;

    for (let cursor = openMin; cursor + calc.totalDurationMinutes <= closeMin; cursor += stepMinutes) {
      const slotStartStr = minutesToTime(cursor);
      const slotEndWithPrepStr = minutesToTime(cursor + totalOccupiedMinutes);
      const slotEndProcedureStr = minutesToTime(cursor + calc.totalDurationMinutes);

      // Respeita antecedência mínima
      const slotDateTime = new Date(`${dateStr}T${slotStartStr}:00`);
      if (slotDateTime.getTime() < now.getTime() + minAdvanceMs) {
        continue;
      }

      // Respeita intervalo de almoço
      if (
        breakStartMin !== null &&
        breakEndMin !== null &&
        hasTimeOverlap(slotStartStr, slotEndProcedureStr, wh.break_start, wh.break_end)
      ) {
        continue;
      }

      // Respeita bloqueios parciais de horário
      const overlapsBlocking = blockings.some((b) =>
        hasTimeOverlap(slotStartStr, slotEndProcedureStr, b.start_time, b.end_time)
      );
      if (overlapsBlocking) continue;

      // Respeita agendamentos existentes (+ tempo de preparação)
      const overlapsBooking = existingBookings.some((eb) =>
        hasTimeOverlap(slotStartStr, slotEndWithPrepStr, eb.start_time, eb.end_time)
      );
      if (overlapsBooking) continue;

      slots.push(slotStartStr);
    }

    return slots;
  },
};