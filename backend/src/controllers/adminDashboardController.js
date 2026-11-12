import { query } from '../config/database.js';
import { buildCsvBuffer } from '../utils/csvExporter.js';

export const adminDashboardController = {
  getOverview: async (req, res, next) => {
    try {
      const { period = 'MONTH', startDate = null, endDate = null } = req.query;
      const periodParams = [period, startDate || null, endDate || null];
      const periodCte = `WITH selected_period AS (
        SELECT
          CASE $1::text
            WHEN 'TODAY' THEN CURRENT_DATE
            WHEN 'WEEK' THEN DATE_TRUNC('week', CURRENT_DATE)::date
            WHEN 'LAST_MONTH' THEN (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::date
            WHEN 'CUSTOM' THEN $2::date
            ELSE DATE_TRUNC('month', CURRENT_DATE)::date
          END AS start_date,
          CASE $1::text
            WHEN 'TODAY' THEN CURRENT_DATE
            WHEN 'WEEK' THEN (DATE_TRUNC('week', CURRENT_DATE)::date + 6)
            WHEN 'LAST_MONTH' THEN (DATE_TRUNC('month', CURRENT_DATE)::date - 1)
            WHEN 'CUSTOM' THEN $3::date
            ELSE CURRENT_DATE
          END AS end_date
      )`;

      // Métricas do período selecionado. "Hoje" continua sendo um indicador operacional independente.
      const { rows: finRows } = await query(`${periodCte}
        SELECT
          COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "completedServicesRevenue",
          COALESCE(AVG(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "averageTicket",
          COALESCE(SUM(b.deposit_paid_amount), 0)::float AS "depositsReceived",
          COALESCE(SUM(b.deposit_paid_amount + b.final_paid_amount), 0)::float AS "actuallyReceivedTotal",
          COALESCE(SUM(b.remaining_balance) FILTER (WHERE b.status IN ('CONFIRMED', 'PENDING_APPROVAL')), 0)::float AS "remainingBalanceToReceive",
          (SELECT COUNT(*)::int FROM bookings WHERE booking_date = CURRENT_DATE) AS "todayBookings",
          COUNT(*)::int AS "monthBookings",
          COUNT(*) FILTER (WHERE b.status = 'PENDING_APPROVAL')::int AS "pendingApprovalCount",
          COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int AS "confirmedCount",
          COUNT(*) FILTER (WHERE b.status = 'COMPLETED')::int AS "completedCount",
          COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS "cancelledCount",
          COUNT(*) FILTER (WHERE b.status = 'NO_SHOW')::int AS "noShowCount"
        FROM bookings b
        CROSS JOIN selected_period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
      `, periodParams);

      const m = finRows[0];
      const totalFinishedOrCancelled = m.completedCount + m.cancelledCount + m.noShowCount;
      const attendanceRate =
        totalFinishedOrCancelled > 0 ? Math.round((m.completedCount / totalFinishedOrCancelled) * 100) : 100;
      const cancellationRate =
        m.monthBookings > 0 ? Math.round((m.cancelledCount / m.monthBookings) * 100) : 0;

      const { rows: topSvc } = await query(`${periodCte}
        SELECT bs.service_name_snapshot AS name, COUNT(*)::int AS count
        FROM booking_services bs
        JOIN bookings b ON b.id = bs.booking_id
        CROSS JOIN selected_period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
        GROUP BY bs.service_name_snapshot
        ORDER BY count DESC
        LIMIT 5
      `, periodParams);

      const { rows: revByDay } = await query(`${periodCte}
        SELECT b.booking_date::text AS date,
               COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS revenue
        FROM bookings b
        CROSS JOIN selected_period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
        GROUP BY b.booking_date
        ORDER BY b.booking_date ASC
      `, periodParams);

      const { rows: upcoming } = await query(`
        SELECT b.id, b.code, b.booking_date::text AS date, b.start_time AS "startTime", b.status,
               c.full_name AS "clientName", STRING_AGG(bs.service_name_snapshot, ' + ') AS "serviceNames"
        FROM bookings b
        JOIN clients c ON c.id = b.client_id
        LEFT JOIN booking_services bs ON bs.booking_id = b.id
        WHERE b.booking_date >= CURRENT_DATE AND b.status IN ('CONFIRMED', 'PENDING_APPROVAL')
        GROUP BY b.id, c.full_name
        ORDER BY b.booking_date ASC, b.start_time ASC
        LIMIT 5
      `);

      const { rows: pendingActions } = await query(`
        SELECT b.id, b.code, b.status, b.deposit_amount::float AS "depositAmount", c.full_name AS "clientName"
        FROM bookings b
        JOIN clients c ON c.id = b.client_id
        WHERE b.status = 'PENDING_APPROVAL'
        ORDER BY b.created_at DESC
        LIMIT 5
      `);

      return res.json({
        period: { type: period, startDate, endDate },
        metrics: {
          ...m,
          attendanceRate,
          cancellationRate,
          topServiceName: topSvc[0]?.name || '-',
        },
        charts: {
          revenueByDay: revByDay,
          topServices: topSvc,
        },
        lists: {
          upcomingBookings: upcoming,
          pendingActions,
          systemAlerts: [],
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  getReports: async (req, res, next) => {
    try {
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const params = [startDate, endDate];
      const periodCte = `WITH period AS (
        SELECT COALESCE($1::date, DATE_TRUNC('month', CURRENT_DATE)::date) AS start_date,
               COALESCE($2::date, CURRENT_DATE) AS end_date
      )`;

      const { rows } = await query(`${periodCte}
        SELECT
          COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS "completedRevenue",
          COALESCE(SUM(b.remaining_balance) FILTER (WHERE b.status = 'CONFIRMED'), 0)::float AS "pendingBalances",
          COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS "cancelledCount",
          COUNT(*) FILTER (WHERE b.status = 'NO_SHOW')::int AS "noShowCount",
          COUNT(*) FILTER (WHERE b.status = 'COMPLETED')::int AS "completedCount",
          COUNT(*)::int AS "bookingCount"
        FROM bookings b, period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date`, params);

      const { rows: cashRows } = await query(`${periodCte}
        SELECT
          COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'PAID' AND pt.transaction_type = 'DEPOSIT'), 0)::float AS "depositsCollected",
          COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'PAID'), 0)::float AS "cashReceived"
        FROM payment_transactions pt, period p
        WHERE pt.created_at::date BETWEEN p.start_date AND p.end_date`, params);

      const { rows: recRows } = await query(`${periodCte}
        SELECT COUNT(*)::int AS count FROM (
          SELECT b.client_id
          FROM bookings b, period p
          WHERE b.status = 'COMPLETED' AND b.booking_date BETWEEN p.start_date AND p.end_date
          GROUP BY b.client_id
          HAVING COUNT(*) > 1
        ) sub`, params);

      const { rows: occupancyRows } = await query(`${periodCte}, days AS (
          SELECT d::date AS day,
                 EXTRACT(DOW FROM d)::int AS dow
          FROM period p,
               GENERATE_SERIES(p.start_date, p.end_date, INTERVAL '1 day') d
        ), capacity AS (
          SELECT COALESCE(SUM(
            CASE WHEN wh.is_open THEN GREATEST(0,
              EXTRACT(EPOCH FROM (wh.close_time::time - wh.open_time::time))/60
              - CASE WHEN wh.break_start IS NOT NULL AND wh.break_end IS NOT NULL
                     THEN GREATEST(0, EXTRACT(EPOCH FROM (wh.break_end::time - wh.break_start::time))/60)
                     ELSE 0 END
            ) ELSE 0 END
          ), 0)::float AS available_minutes
          FROM days d
          JOIN working_hours wh ON wh.day_of_week = d.dow
          WHERE NOT EXISTS (
            SELECT 1 FROM schedule_blockings sb
            WHERE d.day BETWEEN sb.start_date AND sb.end_date
              AND sb.start_time IS NULL AND sb.end_time IS NULL
          )
        ), occupied AS (
          SELECT COALESCE(SUM(b.total_duration_minutes + COALESCE(s.prep_minutes, 15)), 0)::float AS occupied_minutes
          FROM bookings b
          CROSS JOIN studio_settings s
          CROSS JOIN period p
          WHERE b.booking_date BETWEEN p.start_date AND p.end_date
            AND b.status IN ('CONFIRMED', 'COMPLETED', 'PENDING_APPROVAL')
        )
        SELECT available_minutes AS "availableMinutes", occupied_minutes AS "occupiedMinutes",
               CASE WHEN available_minutes > 0
                    THEN LEAST(100, ROUND((occupied_minutes / available_minutes * 100)::numeric, 1))::float
                    ELSE 0 END AS "occupancyRate"
        FROM capacity, occupied`, params);

      const { rows: topServices } = await query(`${periodCte}
        SELECT bs.service_name_snapshot AS name, COUNT(*)::int AS count,
               COALESCE(SUM(bs.price_snapshot), 0)::float AS revenue
        FROM booking_services bs
        JOIN bookings b ON b.id = bs.booking_id
        CROSS JOIN period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
          AND b.status = 'COMPLETED'
        GROUP BY bs.service_name_snapshot
        ORDER BY count DESC, revenue DESC
        LIMIT 10`, params);

      const { rows: revenueByDay } = await query(`${periodCte}
        SELECT b.booking_date::text AS date,
               COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'COMPLETED'), 0)::float AS revenue
        FROM bookings b, period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
        GROUP BY b.booking_date
        ORDER BY b.booking_date ASC`, params);

      return res.json({
        report: {
          ...rows[0],
          ...cashRows[0],
          ...occupancyRows[0],
          recurringClientsCount: recRows[0]?.count || 0,
          topServices,
          revenueByDay,
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  exportReportCsv: async (req, res, next) => {
    try {
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      const { rows } = await query(`
        WITH period AS (
          SELECT COALESCE($1::date, DATE_TRUNC('month', CURRENT_DATE)::date) AS start_date,
                 COALESCE($2::date, CURRENT_DATE) AS end_date
        )
        SELECT b.code, b.booking_date::text AS date, b.start_time, b.status,
               c.full_name AS client_name, b.subtotal_price::float,
               b.discount_amount::float, b.coupon_code_snapshot AS coupon_code,
               b.total_price::float, b.deposit_paid_amount::float,
               b.final_paid_amount::float, b.remaining_balance::float
        FROM bookings b
        JOIN clients c ON c.id = b.client_id
        CROSS JOIN period p
        WHERE b.booking_date BETWEEN p.start_date AND p.end_date
        ORDER BY b.booking_date DESC, b.start_time DESC
      `, [startDate, endDate]);

      const csv = buildCsvBuffer(
        [
          { key: 'code', label: 'Código' },
          { key: 'date', label: 'Data' },
          { key: 'start_time', label: 'Horário' },
          { key: 'client_name', label: 'Cliente' },
          { key: 'status', label: 'Status' },
          { key: 'subtotal_price', label: 'Subtotal' },
          { key: 'discount_amount', label: 'Desconto' },
          { key: 'coupon_code', label: 'Cupom' },
          { key: 'total_price', label: 'Valor Serviço' },
          { key: 'deposit_paid_amount', label: 'Sinal Pago' },
          { key: 'final_paid_amount', label: 'Saldo Liquidado' },
          { key: 'remaining_balance', label: 'Saldo Pendente' },
        ],
        rows
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-consolidado.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  },
};