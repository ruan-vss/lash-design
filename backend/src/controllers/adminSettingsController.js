import { query, withTransaction } from '../config/database.js';
import { whatsappService } from '../services/whatsappService.js';

export const adminSettingsController = {
  getSettings: async (req, res, next) => {
    try {
      const { rows } = await query('SELECT * FROM studio_settings WHERE id = 1');
      return res.json({ settings: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  updateSettings: async (req, res, next) => {
    try {
      const s = req.body;
      await query(
        `UPDATE studio_settings
         SET studio_name = COALESCE($1, studio_name),
             professional_name = COALESCE($2, professional_name),
             whatsapp = COALESCE($3, whatsapp),
             address = COALESCE($4, address),
             timezone = COALESCE($5, timezone),
             cancellation_policy_text = COALESCE($6, cancellation_policy_text),
             updated_at = NOW()
         WHERE id = 1`,
        [
          s.studioName,
          s.professionalName,
          s.whatsapp,
          s.address,
          s.timezone,
          s.cancellationPolicyText,
        ]
      );
      return res.json({ message: 'Configurações salvas.' });
    } catch (err) {
      return next(err);
    }
  },

  getWorkingHours: async (req, res, next) => {
    try {
      const { rows: schedule } = await query(
        `SELECT day_of_week AS "dayOfWeek", label, is_open AS "isOpen",
                open_time AS "openTime", close_time AS "closeTime",
                break_start AS "breakStart", break_end AS "breakEnd"
         FROM working_hours ORDER BY day_of_week ASC`
      );
      const { rows: st } = await query(
        `SELECT prep_minutes AS "prepMinutes", min_advance_hours AS "minAdvanceHours",
                max_advance_days AS "maxAdvanceDays"
         FROM studio_settings WHERE id = 1`
      );
      return res.json({ schedule, ...st[0] });
    } catch (err) {
      return next(err);
    }
  },

  updateWorkingHours: async (req, res, next) => {
    try {
      const { schedule, prepMinutes, minAdvanceHours, maxAdvanceDays } = req.body;

      await withTransaction(async (db) => {
        if (Array.isArray(schedule)) {
          for (const d of schedule) {
            await db.query(
              `UPDATE working_hours
               SET is_open = $2, open_time = $3, close_time = $4, break_start = $5, break_end = $6
               WHERE day_of_week = $1`,
              [d.dayOfWeek, Boolean(d.isOpen), d.openTime, d.closeTime, d.breakStart, d.breakEnd]
            );
          }
        }

        await db.query(
          `UPDATE studio_settings
           SET prep_minutes = COALESCE($1, prep_minutes),
               min_advance_hours = COALESCE($2, min_advance_hours),
               max_advance_days = COALESCE($3, max_advance_days)
           WHERE id = 1`,
          [prepMinutes, minAdvanceHours, maxAdvanceDays]
        );
      });

      // Preserva agendamentos existentes e sinaliza caso algum tenha ficado em dia fechado
      const { rows: conflicts } = await query(`
        SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime", c.full_name AS "clientName"
        FROM bookings b
        JOIN clients c ON c.id = b.client_id
        JOIN working_hours wh ON wh.day_of_week = EXTRACT(DOW FROM b.booking_date)
        WHERE b.booking_date >= CURRENT_DATE
          AND b.status = 'CONFIRMED'
          AND (wh.is_open = FALSE OR b.start_time < wh.open_time OR b.end_time > wh.close_time)
      `);

      return res.json({ message: 'Expediente atualizado.', conflictingBookings: conflicts });
    } catch (err) {
      return next(err);
    }
  },

  getBlockings: async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT id, start_date::text AS "startDate", end_date::text AS "endDate",
                start_time AS "startTime", end_time AS "endTime", reason
         FROM schedule_blockings ORDER BY start_date DESC`
      );
      return res.json({ blockings: rows });
    } catch (err) {
      return next(err);
    }
  },

  createBlocking: async (req, res, next) => {
    try {
      const { startDate, endDate, startTime, endTime, reason } = req.body;
      const { rows } = await query(
        `INSERT INTO schedule_blockings (start_date, end_date, start_time, end_time, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [startDate, endDate, startTime || null, endTime || null, reason]
      );
      return res.status(201).json({ blocking: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  deleteBlocking: async (req, res, next) => {
    try {
      await query('DELETE FROM schedule_blockings WHERE id = $1', [req.params.id]);
      return res.json({ message: 'Bloqueio removido.' });
    } catch (err) {
      return next(err);
    }
  },

  listPromotions: async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT id, code, discount_type AS "discountType", discount_value::float AS "discountValue",
                valid_until::text AS "validUntil", max_uses AS "maxUses", used_count AS "usedCount", active
         FROM promotions ORDER BY created_at DESC`
      );
      return res.json({ promotions: rows });
    } catch (err) {
      return next(err);
    }
  },

  createPromotion: async (req, res, next) => {
    try {
      const { code, discountType, discountValue, validUntil, maxUses } = req.body;
      const { rows } = await query(
        `INSERT INTO promotions (code, discount_type, discount_value, valid_until, max_uses)
         VALUES (UPPER($1), $2, $3, $4, $5) RETURNING *`,
        [code, discountType, discountValue, validUntil, maxUses || 50]
      );
      return res.status(201).json({ promotion: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  togglePromotion: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      await query('UPDATE promotions SET active = $2 WHERE id = $1', [id, Boolean(active)]);
      return res.json({ message: 'Status do cupom atualizado.' });
    } catch (err) {
      return next(err);
    }
  },

  getNotificationsConfig: async (req, res, next) => {
    try {
      const { rows: st } = await query(
        'SELECT whatsapp_enabled, whatsapp_templates FROM studio_settings WHERE id = 1'
      );
      const { rows: logs } = await query(
        `SELECT id, recipient_phone AS "recipientPhone", type, status, attempts,
                provider_message_id AS "providerMessageId", error_detail AS "errorDetail",
                sent_at AS "sentAt", created_at AS "createdAt"
         FROM notification_logs ORDER BY created_at DESC LIMIT 20`
      );
      return res.json({
        enabled: st[0]?.whatsapp_enabled,
        integrationConnected: whatsappService.isConfigured(),
        provider: 'META_CLOUD_API',
        templates: st[0]?.whatsapp_templates,
        logs,
      });
    } catch (err) {
      return next(err);
    }
  },

  updateNotificationsConfig: async (req, res, next) => {
    try {
      const { enabled, templates } = req.body;
      await query(
        'UPDATE studio_settings SET whatsapp_enabled = $1, whatsapp_templates = $2 WHERE id = 1',
        [Boolean(enabled), JSON.stringify(templates)]
      );
      return res.json({ message: 'Templates de WhatsApp atualizados.' });
    } catch (err) {
      return next(err);
    }
  },

  testNotification: async (req, res, next) => {
    try {
      const { phone } = req.body;
      const result = await whatsappService.dispatchMessage({
        recipientPhone: phone,
        type: 'TEST_MESSAGE',
        messageBody: 'Teste de integração do sistema Lash Studio.',
      });
      if (!result.sent) {
        return res.status(400).json({ message: result.errorDetail || result.reason });
      }
      return res.json({ message: 'Mensagem de teste enviada.' });
    } catch (err) {
      return next(err);
    }
  },
};