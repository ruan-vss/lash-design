import { query } from '../config/database.js';

export const adminServiceController = {
  listServices: async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT id, name, category, description, price::float,
                duration_minutes AS "durationMinutes",
                prep_time_minutes AS "prepTimeMinutes",
                deposit_type AS "depositType",
                deposit_value::float AS "depositValue",
                guidelines, maintenance_rules AS "maintenanceRules",
                image_url AS "imageUrl", active
         FROM services
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC`
      );
      return res.json({ services: rows });
    } catch (err) {
      return next(err);
    }
  },

  createService: async (req, res, next) => {
    try {
      const s = req.body;
      const { rows } = await query(
        `INSERT INTO services
         (name, category, description, price, duration_minutes, prep_time_minutes, deposit_type, deposit_value, guidelines, maintenance_rules, image_url, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          s.name,
          s.category,
          s.description,
          s.price,
          s.durationMinutes,
          s.prepTimeMinutes ?? 15,
          s.depositType,
          s.depositValue ?? 0,
          s.guidelines || null,
          s.maintenanceRules || null,
          s.imageUrl || null,
          s.active ?? true,
        ]
      );
      return res.status(201).json({ service: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  updateService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const s = req.body;
      const { rows } = await query(
        `UPDATE services
         SET name = $2, category = $3, description = $4, price = $5,
             duration_minutes = $6, prep_time_minutes = $7, deposit_type = $8,
             deposit_value = $9, guidelines = $10, maintenance_rules = $11,
             image_url = $12, active = $13
         WHERE id = $1
         RETURNING *`,
        [
          id,
          s.name,
          s.category,
          s.description,
          s.price,
          s.durationMinutes,
          s.prepTimeMinutes ?? 15,
          s.depositType,
          s.depositValue ?? 0,
          s.guidelines || null,
          s.maintenanceRules || null,
          s.imageUrl || null,
          s.active ?? true,
        ]
      );
      return res.json({ service: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  toggleServiceActive: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const { rows } = await query(
        'UPDATE services SET active = $2 WHERE id = $1 RETURNING *',
        [id, Boolean(active)]
      );
      return res.json({ service: rows[0] });
    } catch (err) {
      return next(err);
    }
  },

  softDeleteService: async (req, res, next) => {
    try {
      const { id } = req.params;
      await query(
        'UPDATE services SET active = FALSE, deleted_at = NOW() WHERE id = $1',
        [id]
      );
      return res.json({ message: 'Serviço arquivado logicamente preservando histórico.' });
    } catch (err) {
      return next(err);
    }
  },
};