import { query, withTransaction } from '../config/database.js';
import { availabilityEngine } from '../services/availabilityEngine.js';
import { minutesToTime, timeToMinutes, normalizePhone, hasTimeOverlap } from '../utils/timeUtils.js';
import { lockScheduleDates } from '../utils/scheduleLock.js';
import { generateBookingCode } from '../utils/bookingCode.js';
import { whatsappService } from '../services/whatsappService.js';

const notifyBookingSafely = async (bookingId, templateKey, eventKey = null) => {
  try {
    return await whatsappService.sendBookingNotification({ bookingId, templateKey, eventKey });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'whatsapp_booking_notification_failed', bookingId, templateKey, message: error.message }));
    return { sent: false, reason: error.message };
  }
};

// Máquina de estados das reservas.
// COMPLETED e NO_SHOW são estados finais: só ADMIN pode corrigi-los (voltando a CONFIRMED),
// o que estorna o saldo liquidado quando houver.
export const BOOKING_TRANSITIONS = {
  PENDING_APPROVAL: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: ['PENDING_APPROVAL'],
};
const ADMIN_CORRECTIONS = { COMPLETED: ['CONFIRMED'], NO_SHOW: ['CONFIRMED'] };
const FINAL_RESULT_STATUSES = ['COMPLETED', 'NO_SHOW'];

export const resolveTransition = (from, to, role) => {
  if (from === to) return { ok: true, kind: 'SAME' };
  if (BOOKING_TRANSITIONS[from]?.includes(to)) return { ok: true, kind: 'NORMAL' };
  if (ADMIN_CORRECTIONS[from]?.includes(to)) {
    return role === 'ADMIN'
      ? { ok: true, kind: 'CORRECTION' }
      : { ok: false, status: 403, message: 'Somente administradores podem corrigir uma reserva já concluída ou marcada como falta.' };
  }
  return { ok: false, status: 409, message: `Não é possível mudar a reserva de ${from} para ${to}.` };
};

const toDateStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

export const adminBookingController = {
  listBookings: async (req, res, next) => {
    try {
      const { date, viewMode, status, search, page = 1, limit = 30 } = req.query;

      const conditions = [];
      const params = [];

      if (date) {
        if (viewMode === 'WEEK') {
          params.push(date);
          conditions.push(`b.booking_date BETWEEN $${params.length}::date - INTERVAL '3 days' AND $${params.length}::date + INTERVAL '4 days'`);
        } else if (viewMode === 'MONTH') {
          params.push(date);
          conditions.push(`DATE_TRUNC('month', b.booking_date) = DATE_TRUNC('month', $${params.length}::date)`);
        } else {
          params.push(date);
          conditions.push(`b.booking_date = $${params.length}::date`);
        }
      }

      if (status) {
        params.push(status);
        conditions.push(`b.status = $${params.length}`);
      }

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(c.full_name ILIKE $${params.length} OR b.code ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (Number(page) - 1) * Number(limit);

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM bookings b
         JOIN clients c ON c.id = b.client_id
         ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total || 0;

      const { rows } = await query(
        `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime", b.end_time AS "endTime",
                b.status, b.total_price::float AS "totalPrice",
                b.deposit_amount::float AS "depositAmount",
                b.deposit_paid_amount::float AS "depositPaidAmount",
                b.remaining_balance::float AS "remainingBalance",
                b.discount_amount::float AS "discountAmount", b.coupon_code_snapshot AS "couponCode",
                b.client_notes AS notes, b.internal_notes AS "internalNotes",
                c.full_name AS "clientName", c.phone AS "clientPhone",
                STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
         FROM bookings b
         JOIN clients c ON c.id = b.client_id
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         ${whereClause}
         GROUP BY b.id, c.full_name, c.phone
         ORDER BY b.booking_date DESC, b.start_time ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      );

      const totalPages = Math.max(1, Math.ceil(total / Number(limit)));
      return res.json({
        bookings: rows,
        totalPages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      });
    } catch (err) {
      return next(err);
    }
  },

  createManualBooking: async (req, res, next) => {
    try {
      const { clientName, clientPhone, serviceIds, date, startTime, status, internalNotes } = req.body;

      const created = await withTransaction(async (db) => {
        await lockScheduleDates(db, date);
        const calc = await availabilityEngine.calculateOfficialTotals(serviceIds, null, db);
        const endTime = minutesToTime(
          timeToMinutes(startTime) + calc.totalDurationMinutes + calc.prepMinutes
        );

        // Valida se há sobreposição na agenda
        const { rows: existing } = await db.query(
          `SELECT start_time, end_time FROM bookings
           WHERE booking_date = $1::date
             AND status IN ('CONFIRMED', 'PENDING_APPROVAL')`,
          [date]
        );

        const conflict = existing.some((eb) =>
          hasTimeOverlap(startTime, endTime, eb.start_time, eb.end_time)
        );
        if (conflict) {
          const err = new Error('Já existe um atendimento confirmado ou pendente neste intervalo de horário.');
          err.statusCode = 409;
          throw err;
        }

        const cleanPhone = normalizePhone(clientPhone);
        const { rows: clientRows } = await db.query(
          `INSERT INTO clients (full_name, phone)
           VALUES ($1, $2)
           ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING *`,
          [clientName, cleanPhone]
        );

        const code = generateBookingCode();
        const { rows: bookingRows } = await db.query(
          `INSERT INTO bookings (
            code, client_id, booking_date, start_time, end_time, total_duration_minutes,
            subtotal_price, discount_amount, total_price, deposit_amount, deposit_paid_amount,
            remaining_balance, status, internal_notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,0,$10,$11,$12)
          RETURNING *`,
          [
            code,
            clientRows[0].id,
            date,
            startTime,
            endTime,
            calc.totalDurationMinutes,
            calc.subtotalPrice,
            calc.totalPrice,
            calc.depositAmount,
            calc.totalPrice,
            status || 'CONFIRMED',
            internalNotes || null,
          ]
        );

        for (const s of calc.services) {
          await db.query(
            `INSERT INTO booking_services (booking_id, service_id, service_name_snapshot, price_snapshot, duration_minutes_snapshot)
             VALUES ($1, $2, $3, $4, $5)`,
            [bookingRows[0].id, s.id, s.name, s.price, s.duration_minutes]
          );
        }

        return bookingRows[0];
      });

      if (created.status === 'CONFIRMED') await notifyBookingSafely(created.id, 'confirmation', `${created.id}:CONFIRMED:CREATE`);
      return res.status(201).json({ booking: created });
    } catch (err) {
      return next(err);
    }
  },

  updateBookingStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, reason, internalNotes } = req.body;

      const updated = await withTransaction(async (db) => {
        const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (rows.length === 0) {
          const err = new Error('Reserva não encontrada.');
          err.statusCode = 404;
          throw err;
        }
        const b = rows[0];

        const transition = resolveTransition(b.status, status, req.user.role);
        if (!transition.ok) {
          const err = new Error(transition.message);
          err.statusCode = transition.status;
          throw err;
        }
        if (FINAL_RESULT_STATUSES.includes(status) && transition.kind !== 'SAME') {
          const today = new Date().toISOString().slice(0, 10);
          if (toDateStr(b.booking_date) > today) {
            const err = new Error('Não é possível concluir ou marcar falta em uma reserva de data futura.');
            err.statusCode = 409;
            throw err;
          }
        }

        let finalPaidOverride = null;
        let remainingOverride = null;
        if (transition.kind === 'CORRECTION') {
          if (!reason || reason.trim().length < 5) {
            const err = new Error('Informe uma justificativa (mín. 5 caracteres) para corrigir esta reserva.');
            err.statusCode = 400;
            throw err;
          }
          // Estorna o saldo liquidado ao concluir (mantém o histórico: a transação vira REFUNDED).
          const { rows: settled } = await db.query(
            `UPDATE payment_transactions
                SET status = 'REFUNDED',
                    audit_reason = LEFT(COALESCE(audit_reason || ' | ', '') || 'Estorno por correção de status: ' || $2, 1000)
              WHERE booking_id = $1 AND transaction_type = 'BALANCE_SETTLEMENT' AND status = 'PAID'
              RETURNING amount`,
            [b.id, reason.trim()]
          );
          const refunded = settled.reduce((acc, r) => acc + Number(r.amount), 0);
          finalPaidOverride = Math.max(0, Number(b.final_paid_amount) - refunded);
          remainingOverride = Number(b.remaining_balance) + refunded;
        }

        // Reativar uma reserva também precisa respeitar a exclusividade da agenda.
        if (['CONFIRMED', 'PENDING_APPROVAL'].includes(status) && !['CONFIRMED', 'PENDING_APPROVAL'].includes(b.status)) {
          const bookingDate = b.booking_date instanceof Date
            ? b.booking_date.toISOString().slice(0, 10)
            : String(b.booking_date).slice(0, 10);
          await lockScheduleDates(db, bookingDate);
          const { rows: overlaps } = await db.query(
            `SELECT id FROM bookings
             WHERE booking_date = $1::date
               AND id <> $2
               AND status IN ('CONFIRMED', 'PENDING_APPROVAL', 'COMPLETED')
               AND start_time < $4
               AND end_time > $3
             LIMIT 1`,
            [bookingDate, id, b.start_time, b.end_time]
          );
          if (overlaps.length > 0) {
            const conflict = new Error('Não é possível reativar a reserva: o horário já está ocupado.');
            conflict.statusCode = 409;
            throw conflict;
          }
        }

        let finalPaid = finalPaidOverride ?? Number(b.final_paid_amount);
        let remaining = remainingOverride ?? Number(b.remaining_balance);

        // Cupom: cancelar devolve o uso; reativar consome novamente (se ainda houver saldo de usos).
        if (b.promotion_id && transition.kind !== 'SAME') {
          if (status === 'CANCELLED') {
            await db.query('UPDATE promotions SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1', [b.promotion_id]);
          } else if (b.status === 'CANCELLED') {
            await db.query('UPDATE promotions SET used_count = used_count + 1 WHERE id = $1 AND used_count < max_uses', [b.promotion_id]);
          }
        }

        // Ao concluir o atendimento, liquida o saldo restante sem duplicar o sinal já pago
        if (status === 'COMPLETED' && remaining > 0) {
          finalPaid = remaining;
          remaining = 0;

          await db.query(
            `INSERT INTO payment_transactions (booking_id, transaction_type, payment_method, amount, status, created_by_user_id)
             VALUES ($1, 'BALANCE_SETTLEMENT', 'CASH', $2, 'PAID', $3)`,
            [b.id, finalPaid, req.user.id]
          );
        }

        const { rows: result } = await db.query(
          `UPDATE bookings
           SET status = $2,
               final_paid_amount = $3,
               remaining_balance = $4,
               cancellation_reason = COALESCE($5, cancellation_reason),
               internal_notes = COALESCE($6, internal_notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, status, finalPaid, remaining, reason || null, internalNotes || null]
        );

        return { booking: result[0], previousStatus: b.status };
      });

      const { booking: updatedBooking, previousStatus } = updated;
      if (status !== previousStatus && status === 'CONFIRMED') {
        await notifyBookingSafely(updatedBooking.id, 'confirmation', `${updatedBooking.id}:CONFIRMED:${updatedBooking.updated_at}`);
      }
      if (status !== previousStatus && status === 'CANCELLED') {
        await notifyBookingSafely(updatedBooking.id, 'cancellation', `${updatedBooking.id}:CANCELLED:${updatedBooking.updated_at}`);
      }
      return res.json({ booking: updatedBooking });
    } catch (err) {
      return next(err);
    }
  },
};