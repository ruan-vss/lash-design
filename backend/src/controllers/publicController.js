import { query, withTransaction } from '../config/database.js';
import { availabilityEngine } from '../services/availabilityEngine.js';
import { whatsappService } from '../services/whatsappService.js';
import { minutesToTime, timeToMinutes, normalizePhone, hasTimeOverlap } from '../utils/timeUtils.js';
import { issueClientAccessToken, verifyClientAccessToken } from '../middlewares/authMiddleware.js';
import { lockScheduleDates } from '../utils/scheduleLock.js';
import { generateBookingCode } from '../utils/bookingCode.js';

const toDateString = (value) => (value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value).slice(0, 10));

const isPastBooking = (b) => new Date(`${toDateString(b.booking_date)}T${b.start_time}:00`).getTime() <= Date.now();

const calendarCache = new Map();
const CALENDAR_CACHE_TTL_MS = 30 * 1000;
const MAX_PENDING_PER_CLIENT = 3;
const ACTIVE_CLIENT_STATUSES = ['PENDING_APPROVAL', 'CONFIRMED'];

const issueClientToken = (payload) => issueClientAccessToken(payload);
const notifyBookingSafely = async (bookingId, templateKey, eventKey = null) => {
  try {
    return await whatsappService.sendBookingNotification({ bookingId, templateKey, eventKey });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'whatsapp_booking_notification_failed', bookingId, templateKey, message: error.message }));
    return { sent: false, reason: error.message };
  }
};
export const publicController = {
  getStudioConfig: async (req, res, next) => {
    try {
      const { rows } = await query('SELECT * FROM studio_settings WHERE id = 1');
      const s = rows[0];
      return res.json({
        studio: {
          studioName: s.studio_name,
          description: s.description,
          professionalName: s.professional_name,
          professionalBio: s.professional_bio,
          phone: s.phone,
          whatsapp: s.whatsapp,
          address: s.address,
          openingHoursText: s.opening_hours_text,
          confirmationMode: 'ADMIN_APPROVAL',
          cancellationPolicyText: s.cancellation_policy_text,
          allowMultipleServices: s.allow_multiple_services,
          allowClientReschedule: s.allow_client_reschedule,
          timezone: s.timezone,
          reviews: [], // Nunca retorna avaliações fictícias
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  getPublicServices: async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT id, name, category, description, price::float, duration_minutes AS "durationMinutes",
                prep_time_minutes AS "prepTimeMinutes", deposit_type AS "depositType",
                deposit_value::float AS "depositValue", guidelines, maintenance_rules AS "maintenanceRules",
                image_url AS "imageUrl", active
         FROM services
         WHERE active = TRUE AND deleted_at IS NULL
         ORDER BY category, name`
      );
      return res.json({ services: rows });
    } catch (err) {
      return next(err);
    }
  },

  getMonthlyAvailability: async (req, res, next) => {
    try {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      const serviceIds = (req.query.serviceIds || '').split(',').filter(Boolean);

      if (!year || !month || serviceIds.length === 0) {
        return res.json({ unavailableDates: [] });
      }

      const cacheKey = `${year}-${month}:${[...serviceIds].sort().join(',')}`;
      const cached = calendarCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json({ unavailableDates: cached.value });
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const unavailableDates = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const slots = await availabilityEngine.getAvailableSlotsForDate(dateStr, serviceIds);
        if (slots.length === 0) {
          unavailableDates.push(dateStr);
        }
      }

      if (calendarCache.size > 500) calendarCache.clear();
      calendarCache.set(cacheKey, { value: unavailableDates, expiresAt: Date.now() + CALENDAR_CACHE_TTL_MS });
      return res.json({ unavailableDates });
    } catch (err) {
      return next(err);
    }
  },

  getAvailableSlots: async (req, res, next) => {
    try {
      const { date, serviceIds } = req.query;
      const ids = (serviceIds || '').split(',').filter(Boolean);
      if (!date || ids.length === 0) {
        return res.status(400).json({ message: 'Informe a data e os serviços desejados.' });
      }
      const slots = await availabilityEngine.getAvailableSlotsForDate(date, ids);
      return res.json({ slots });
    } catch (err) {
      return next(err);
    }
  },

  previewBooking: async (req, res, next) => {
    try {
      const { serviceIds, couponCode } = req.body;
      const summary = await availabilityEngine.calculateOfficialTotals(serviceIds, couponCode);
      return res.json({
        subtotalPrice: summary.subtotalPrice,
        discountAmount: summary.discountAmount,
        totalPrice: summary.totalPrice,
        depositAmount: summary.depositAmount,
        remainingBalance: summary.remainingBalance,
        totalDurationMinutes: summary.totalDurationMinutes,
      });
    } catch (err) {
      return next(err);
    }
  },

  createBooking: async (req, res, next) => {
    try {
      const { serviceIds, date, startTime, couponCode, client: clientInput } = req.body;

      const result = await withTransaction(async (db) => {
        const { rows: stRows } = await db.query('SELECT max_advance_days FROM studio_settings WHERE id = 1');
        const maxDays = Number(stRows[0]?.max_advance_days || 0);
        if (maxDays > 0) {
          const limit = new Date();
          limit.setDate(limit.getDate() + maxDays);
          if (new Date(`${date}T00:00:00`) > limit) {
            const err = new Error(`Só é possível agendar com até ${maxDays} dias de antecedência.`);
            err.statusCode = 400;
            throw err;
          }
        }
        // Lock transacional por data: também protege dias ainda vazios contra corrida.
        await lockScheduleDates(db, date);

        const availableSlots = await availabilityEngine.getAvailableSlotsForDate(date, serviceIds, db);
        if (!availableSlots.includes(startTime)) {
          const conflictErr = new Error('Horário indisponível ou recém-ocupado por outra cliente.');
          conflictErr.statusCode = 409;
          throw conflictErr;
        }

        const calc = await availabilityEngine.calculateOfficialTotals(serviceIds, couponCode, db);
        const endTime = minutesToTime(
          timeToMinutes(startTime) + calc.totalDurationMinutes + calc.prepMinutes
        );

        // Cria ou atualiza cliente pelo telefone
        const cleanPhone = normalizePhone(clientInput.phone);
        // SEGURANÇA: o telefone não é verificado, então um formulário público nunca pode
        // alterar nome, e-mail ou consentimento de uma cliente que já existe.
        // O UPDATE é um no-op apenas para o RETURNING devolver a linha existente.
        const { rows: clientRows } = await db.query(
          `INSERT INTO clients (full_name, phone, email, whatsapp_consent)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (phone) DO UPDATE SET phone = clients.phone
           RETURNING *`,
          [clientInput.fullName, cleanPhone, clientInput.email || null, Boolean(clientInput.whatsappConsent)]
        );
        const clientRecord = clientRows[0];

        // Anti-abuso: limita solicitações pendentes futuras por telefone.
        const { rows: pendingRows } = await db.query(
          `SELECT COUNT(*)::int AS total FROM bookings
           WHERE client_id = $1 AND status = 'PENDING_APPROVAL' AND booking_date >= CURRENT_DATE`,
          [clientRecord.id]
        );
        if (pendingRows[0].total >= MAX_PENDING_PER_CLIENT) {
          const limitErr = new Error('Você já possui solicitações pendentes de aprovação. Aguarde a confirmação do estúdio ou cancele uma delas.');
          limitErr.statusCode = 429;
          throw limitErr;
        }

        const code = generateBookingCode();
        // Não há pagamento online: toda solicitação aguarda aprovação da profissional.
        const initialStatus = 'PENDING_APPROVAL';

        const { rows: bookingRows } = await db.query(
          `INSERT INTO bookings (
            code, client_id, booking_date, start_time, end_time, total_duration_minutes,
            subtotal_price, discount_amount, promotion_id, coupon_code_snapshot,
            total_price, deposit_amount, deposit_paid_amount,
            remaining_balance, status, client_notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13,$14,$15)
          RETURNING *`,
          [
            code,
            clientRecord.id,
            date,
            startTime,
            endTime,
            calc.totalDurationMinutes,
            calc.subtotalPrice,
            calc.discountAmount,
            calc.promotion?.id || null,
            calc.promotion?.code || null,
            calc.totalPrice,
            calc.depositAmount,
            calc.totalPrice, // Saldo restante começa igual ao total até o sinal ser compensado
            initialStatus,
            clientInput.notes || null,
          ]
        );
        const booking = bookingRows[0];

        if (calc.promotion) {
          const promoUpdate = await db.query(
            `UPDATE promotions
             SET used_count = used_count + 1
             WHERE id = $1 AND active = TRUE AND used_count < max_uses
             RETURNING id`,
            [calc.promotion.id]
          );
          if (promoUpdate.rowCount !== 1) {
            const couponErr = new Error('O cupom atingiu o limite de usos durante a reserva. Tente novamente.');
            couponErr.statusCode = 409;
            throw couponErr;
          }
        }

        for (const s of calc.services) {
          await db.query(
            `INSERT INTO booking_services (booking_id, service_id, service_name_snapshot, price_snapshot, duration_minutes_snapshot)
             VALUES ($1, $2, $3, $4, $5)`,
            [booking.id, s.id, s.name, s.price, s.duration_minutes]
          );
        }

        const accessToken = issueClientToken({ bookingId: booking.id, clientId: clientRecord.id });

        return {
          id: booking.id,
          code: booking.code,
          status: booking.status,
          depositAmount: Number(booking.deposit_amount),
          accessToken,
        };
      });

      return res.status(201).json({ booking: result });
    } catch (err) {
      return next(err);
    }
  },

  lookupClientBookings: async (req, res, next) => {
    try {
      const { bookingCode, phone } = req.body;
      const cleanPhone = normalizePhone(phone);

      const { rows: match } = await query(
        `SELECT b.id, b.client_id
         FROM bookings b
         JOIN clients c ON c.id = b.client_id
         WHERE UPPER(b.code) = UPPER($1) AND c.phone = $2`,
        [bookingCode.trim(), cleanPhone]
      );

      if (match.length === 0) {
        return res.status(404).json({ message: 'Nenhuma reserva localizada para o código e telefone informados.' });
      }

      const clientId = match[0].client_id;
      // SEGURANÇA: o telefone não é verificado; por isso o lookup só expõe a reserva
      // cujo código foi informado e o token fica restrito a ela (bookingId).
      const { rows: bookings } = await query(
        `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime",
                b.status, b.total_price::float AS "totalPrice",
                b.deposit_paid_amount::float AS "depositPaidAmount",
                b.remaining_balance::float AS "remainingBalance",
                STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = $1
         GROUP BY b.id`,
        [match[0].id]
      );

      const accessToken = issueClientToken({ clientId, bookingId: match[0].id });
      return res.json({ bookings, accessToken });
    } catch (err) {
      return next(err);
    }
  },

  getClientBookingDetails: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { token } = req.query;

      const { rows } = await query(
        `SELECT b.id, b.client_id, b.code, b.booking_date::text AS date, b.start_time AS "startTime",
                b.status, b.total_price::float AS "totalPrice",
                b.deposit_paid_amount::float AS "depositPaidAmount",
                b.remaining_balance::float AS "remainingBalance",
                STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames",
                STRING_AGG(s.guidelines, ' ') AS guidelines
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         LEFT JOIN services s ON s.id = bs.service_id
         WHERE b.id = $1
         GROUP BY b.id`,
        [id]
      );

      if (rows.length === 0) return res.status(404).json({ message: 'Reserva não encontrada.' });
      const booking = rows[0];

      if (!verifyClientAccessToken(token, booking.id, booking.client_id)) {
        return res.status(403).json({ message: 'Acesso não autorizado aos detalhes desta reserva.' });
      }

      return res.json({ booking });
    } catch (err) {
      return next(err);
    }
  },

  cancelClientBooking: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason, token } = req.body;

      const updatedBooking = await withTransaction(async (db) => {
        const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (rows.length === 0) {
          const err = new Error('Reserva não encontrada.');
          err.statusCode = 404;
          throw err;
        }
        const b = rows[0];

        if (!verifyClientAccessToken(token, b.id, b.client_id)) {
          const err = new Error('Token inválido.');
          err.statusCode = 403;
          throw err;
        }
        if (b.status === 'CANCELLED') {
          const err = new Error('Esta reserva já está cancelada.');
          err.statusCode = 409;
          throw err;
        }
        // Reservas concluídas ou com falta nunca podem ser alteradas pela cliente.
        if (!ACTIVE_CLIENT_STATUSES.includes(b.status)) {
          const err = new Error('Esta reserva não pode mais ser cancelada pelo site. Entre em contato com o estúdio.');
          err.statusCode = 409;
          throw err;
        }
        if (isPastBooking(b)) {
          const err = new Error('Não é possível cancelar uma reserva que já passou.');
          err.statusCode = 409;
          throw err;
        }

        await db.query(
          `UPDATE bookings
           SET status = 'CANCELLED', cancellation_reason = $2, updated_at = NOW()
           WHERE id = $1`,
          [id, reason || 'Cancelado pela cliente']
        );

        // Devolve o uso do cupom consumido por esta reserva.
        if (b.promotion_id) {
          await db.query(
            'UPDATE promotions SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1',
            [b.promotion_id]
          );
        }

        const updated = await db.query(
          `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime",
                  b.status, b.total_price::float AS "totalPrice",
                  b.deposit_paid_amount::float AS "depositPaidAmount",
                  b.remaining_balance::float AS "remainingBalance",
                  STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
           FROM bookings b
           LEFT JOIN booking_services bs ON bs.booking_id = b.id
           WHERE b.id = $1 GROUP BY b.id`,
          [id]
        );
        return updated.rows[0];
      });

      await notifyBookingSafely(id, 'cancellation', `${id}:CANCELLED:CLIENT`);
      return res.json({ booking: updatedBooking });
    } catch (err) {
      return next(err);
    }
  },

  rescheduleClientBooking: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newDate, newStartTime, token } = req.body;

      const updatedBooking = await withTransaction(async (db) => {
        const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (rows.length === 0) {
          const err = new Error('Reserva não encontrada.');
          err.statusCode = 404;
          throw err;
        }
        const b = rows[0];

        if (!verifyClientAccessToken(token, b.id, b.client_id)) {
          const err = new Error('Token inválido.');
          err.statusCode = 403;
          throw err;
        }

        const { rows: policyRows } = await db.query(
          'SELECT allow_client_reschedule, max_advance_days FROM studio_settings WHERE id = 1'
        );
        const policy = policyRows[0] || {};
        if (policy.allow_client_reschedule === false) {
          const err = new Error('O estúdio não permite reagendamento pelo site. Entre em contato para remarcar.');
          err.statusCode = 403;
          throw err;
        }
        if (!ACTIVE_CLIENT_STATUSES.includes(b.status)) {
          const err = new Error('Esta reserva não pode ser reagendada no status atual.');
          err.statusCode = 409;
          throw err;
        }
        if (isPastBooking(b)) {
          const err = new Error('Não é possível reagendar uma reserva que já passou.');
          err.statusCode = 409;
          throw err;
        }
        if (policy.max_advance_days) {
          const limit = new Date();
          limit.setDate(limit.getDate() + Number(policy.max_advance_days));
          if (new Date(`${newDate}T00:00:00`) > limit) {
            const err = new Error(`A nova data excede a antecedência máxima de ${policy.max_advance_days} dias.`);
            err.statusCode = 400;
            throw err;
          }
        }

        const oldDate = b.booking_date instanceof Date
          ? b.booking_date.toISOString().slice(0, 10)
          : String(b.booking_date).slice(0, 10);
        await lockScheduleDates(db, [oldDate, newDate]);

        const { rows: svcRows } = await db.query(
          'SELECT service_id FROM booking_services WHERE booking_id = $1',
          [id]
        );
        const serviceIds = svcRows.map((r) => r.service_id);

        const slots = await availabilityEngine.getAvailableSlotsForDate(
          newDate,
          serviceIds,
          db,
          { excludeBookingId: id }
        );
        if (!slots.includes(newStartTime)) {
          const err = new Error('O novo horário solicitado não está disponível.');
          err.statusCode = 409;
          throw err;
        }

        const { rows: settings } = await db.query('SELECT prep_minutes FROM studio_settings WHERE id = 1');
        const newEndTime = minutesToTime(
          timeToMinutes(newStartTime) + b.total_duration_minutes + (settings[0]?.prep_minutes || 15)
        );

        await db.query(
          `UPDATE bookings
           SET booking_date = $2, start_time = $3, end_time = $4,
               status = 'PENDING_APPROVAL', updated_at = NOW()
           WHERE id = $1`,
          [id, newDate, newStartTime, newEndTime]
        );

        const updated = await db.query(
          `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime",
                  b.status, b.total_price::float AS "totalPrice",
                  b.deposit_paid_amount::float AS "depositPaidAmount",
                  b.remaining_balance::float AS "remainingBalance",
                  STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
           FROM bookings b
           LEFT JOIN booking_services bs ON bs.booking_id = b.id
           WHERE b.id = $1 GROUP BY b.id`,
          [id]
        );
        return updated.rows[0];
      });

      await notifyBookingSafely(id, 'reschedule', `${id}:RESCHEDULE:${newDate}:${newStartTime}`);
      return res.json({ booking: updatedBooking });
    } catch (err) {
      return next(err);
    }
  },
};
