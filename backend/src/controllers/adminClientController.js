import { query } from '../config/database.js';

export const adminClientController = {
  listClients: async (req, res, next) => {
    try {
      const { search = '', page = 1, limit = 20 } = req.query;
      const pattern = `%${search}%`;
      const offset = (Number(page) - 1) * Number(limit);

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM clients c
         WHERE c.full_name ILIKE $1 OR c.phone ILIKE $1 OR COALESCE(c.email, '') ILIKE $1`,
        [pattern]
      );
      const total = countResult.rows[0]?.total || 0;

      const { rows } = await query(
        `SELECT c.id, c.full_name AS "fullName", c.phone, c.email, c.internal_notes AS "internalNotes",
                MIN(b.booking_date)::text AS "firstVisitDate",
                MAX(b.booking_date)::text AS "lastVisitDate",
                COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::int AS "totalVisits"
         FROM clients c
         LEFT JOIN bookings b ON b.client_id = c.id
         WHERE c.full_name ILIKE $1 OR c.phone ILIKE $1 OR COALESCE(c.email, '') ILIKE $1
         GROUP BY c.id
         ORDER BY c.full_name ASC
         LIMIT $2 OFFSET $3`,
        [pattern, Number(limit), offset]
      );
      return res.json({
        clients: rows,
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

  getClientDetails: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rows: clientRows } = await query(
        'SELECT id, full_name AS "fullName", phone, email, internal_notes AS "internalNotes" FROM clients WHERE id = $1',
        [id]
      );
      if (clientRows.length === 0) return res.status(404).json({ message: 'Cliente não encontrada.' });

      const { rows: bookings } = await query(
        `SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime",
                b.status, b.total_price::float AS "totalPrice",
                b.discount_amount::float AS "discountAmount", b.coupon_code_snapshot AS "couponCode",
                STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.client_id = $1
         GROUP BY b.id
         ORDER BY b.booking_date DESC
         LIMIT 100`,
        [id]
      );

      return res.json({ client: { ...clientRows[0], bookings } });
    } catch (err) {
      return next(err);
    }
  },

  updateClientNotes: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { internalNotes } = req.body;
      await query('UPDATE clients SET internal_notes = $2 WHERE id = $1', [id, internalNotes || '']);
      return res.json({ message: 'Ficha técnica atualizada.' });
    } catch (err) {
      return next(err);
    }
  },
};
