import { query, withTransaction } from '../config/database.js';
import { buildCsvBuffer } from '../utils/csvExporter.js';

const DEPOSIT_METHODS = new Set(['CASH', 'CREDIT_CARD']);

export const adminPaymentController = {
  /**
   * Registra manualmente o sinal recebido (dinheiro ou cartão presencial).
   */
  registerDeposit: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { amount, method, note } = req.body;

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 100000) {
        return res.status(400).json({ message: 'Informe um valor de sinal maior que zero.' });
      }
      if (!DEPOSIT_METHODS.has(method)) {
        return res.status(400).json({ message: 'Forma de pagamento inválida. Use CASH ou CREDIT_CARD.' });
      }
      const cleanNote = typeof note === 'string' ? note.trim().slice(0, 300) : null;
      const cents = Math.round(numericAmount * 100);

      const booking = await withTransaction(async (db) => {
        const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (rows.length === 0) {
          const err = new Error('Reserva não encontrada.');
          err.statusCode = 404;
          throw err;
        }
        const b = rows[0];
        if (!['PENDING_APPROVAL', 'CONFIRMED'].includes(b.status)) {
          const err = new Error('Só é possível registrar sinal em reservas pendentes ou confirmadas.');
          err.statusCode = 400;
          throw err;
        }
        if (cents > Math.round(Number(b.remaining_balance) * 100)) {
          const err = new Error('O valor informado é maior que o saldo restante da reserva.');
          err.statusCode = 400;
          throw err;
        }

        await db.query(
          `INSERT INTO payment_transactions
             (booking_id, transaction_type, payment_method, amount, status, audit_reason, created_by_user_id)
           VALUES ($1, 'DEPOSIT', $2, $3, 'PAID', $4, $5)`,
          [id, method, cents / 100, cleanNote || null, req.user.id]
        );

        const { rows: updated } = await db.query(
          `UPDATE bookings
           SET deposit_paid_amount = deposit_paid_amount + $2,
               remaining_balance = remaining_balance - $2,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, code, status, total_price::float AS "totalPrice",
                     deposit_amount::float AS "depositAmount",
                     deposit_paid_amount::float AS "depositPaidAmount",
                     remaining_balance::float AS "remainingBalance"`,
          [id, cents / 100]
        );
        return updated[0];
      });

      return res.status(201).json({ message: 'Sinal registrado.', booking });
    } catch (err) {
      return next(err);
    }
  },

  listTransactions: async (req, res, next) => {
    try {
      const { method, status, page = 1, limit = 20 } = req.query;
      const conditions = [];
      const params = [];

      if (method) {
        params.push(method);
        conditions.push(`pt.payment_method = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`pt.status = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (Number(page) - 1) * Number(limit);

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM payment_transactions pt ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total || 0;

      const { rows } = await query(
        `SELECT pt.id, pt.booking_id AS "bookingId", b.code AS "bookingCode",
                c.full_name AS "clientName",
                STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceName",
                b.total_price::float AS "totalAmount",
                b.deposit_amount::float AS "depositDue",
                b.deposit_paid_amount::float AS "depositPaid",
                b.remaining_balance::float AS "remainingBalance",
                pt.amount::float AS amount,
                pt.transaction_type AS "transactionType",
                pt.payment_method AS "paymentMethod",
                pt.status,
                pt.audit_reason AS "auditReason",
                pt.created_at AS "createdAt"
         FROM payment_transactions pt
         JOIN bookings b ON b.id = pt.booking_id
         JOIN clients c ON c.id = b.client_id
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         ${whereClause}
         GROUP BY pt.id, b.code, c.full_name, b.total_price, b.deposit_amount, b.deposit_paid_amount, b.remaining_balance
         ORDER BY pt.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      );

      return res.json({
        transactions: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.max(1, Math.ceil(total / Number(limit)))
        }
      });
    } catch (err) {
      return next(err);
    }
  },

  createAuditAdjustment: async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const { amount, reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: 'Informe uma justificativa detalhada para auditoria.' });
      }

      await withTransaction(async (db) => {
        const { rows: bRows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
        if (bRows.length === 0) {
          const err = new Error('Reserva não encontrada.');
          err.statusCode = 404;
          throw err;
        }
        const b = bRows[0];
        const numericAmount = Number(amount);

        await db.query(
          `INSERT INTO payment_transactions
           (booking_id, transaction_type, payment_method, amount, status, audit_reason, created_by_user_id)
           VALUES ($1, 'AUDIT_ADJUSTMENT', 'ADMIN_AUDIT', $2, 'PAID', $3, $4)`,
          [bookingId, numericAmount, reason, req.user.id]
        );

        const newRemaining = Math.max(0, Number(b.remaining_balance) - numericAmount);
        await db.query(
          `UPDATE bookings
           SET final_paid_amount = final_paid_amount + $2,
               remaining_balance = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [bookingId, numericAmount, newRemaining]
        );
      });

      return res.status(201).json({ message: 'Ajuste administrativo auditável registrado.' });
    } catch (err) {
      return next(err);
    }
  },

  exportCsv: async (req, res, next) => {
    try {
      const { method, status } = req.query;
      const conditions = [];
      const params = [];

      if (method) {
        params.push(method);
        conditions.push(`pt.payment_method = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`pt.status = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT b.code AS booking_code, c.full_name AS client_name,
                pt.transaction_type, pt.payment_method, pt.amount::float, pt.status,
                pt.audit_reason, pt.created_at::text
         FROM payment_transactions pt
         JOIN bookings b ON b.id = pt.booking_id
         JOIN clients c ON c.id = b.client_id
         ${whereClause}
         ORDER BY pt.created_at DESC`,
        params
      );

      const csv = buildCsvBuffer(
        [
          { key: 'booking_code', label: 'Reserva' },
          { key: 'client_name', label: 'Cliente' },
          { key: 'transaction_type', label: 'Tipo' },
          { key: 'payment_method', label: 'Método' },
          { key: 'amount', label: 'Valor (BRL)' },
          { key: 'status', label: 'Status' },
          { key: 'audit_reason', label: 'Justificativa Auditoria' },
          { key: 'created_at', label: 'Data' },
        ],
        rows
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="transacoes-financeiras.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  },
};