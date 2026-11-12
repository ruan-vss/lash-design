import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/database.js';
import { env } from '../config/env.js';
import { emailService } from '../services/emailService.js';
import {
  signAdminToken,
  MAX_SESSION_SECONDS,
  invalidateUserAuthCache
} from '../middlewares/authMiddleware.js';
import {
  registerLoginFailure,
  clearLoginFailures
} from '../middlewares/loginRateLimiter.js';

const BCRYPT_COST = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  BCRYPT_COST
);

const generateRandomTemporaryPassword = () => {
  const rand = crypto.randomBytes(9).toString('base64url');
  return `Tmp#${rand}9aA!`;
};

export const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { rows } = await query(
        `SELECT id, name, email, password_hash, role, active,
                must_change_password, token_version
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      const user = rows[0];
      const targetHash = user ? user.password_hash : DUMMY_PASSWORD_HASH;
      const validPassword = await bcrypt.compare(password, targetHash);

      if (!user || !user.active || !validPassword) {
        registerLoginFailure(email);
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }

      clearLoginFailures(email);

      const token = signAdminToken(user);

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: Boolean(user.must_change_password),
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      const { rows } = await query(
        'SELECT id, email, active FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      const responsePayload = {
        message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.',
      };

      if (rows.length > 0 && rows[0].active) {
        const user = rows[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        await query(
          'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
          [user.id]
        );

        await query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_ip)
           VALUES ($1, $2, $3, $4)`,
          [user.id, tokenHash, expiresAt, req.ip || null]
        );

        try {
          const delivery = await emailService.sendPasswordReset({ to: user.email, token: rawToken });
          if (!delivery.sent && env.NODE_ENV !== 'production') {
            console.warn('[auth] Recuperação de senha criada, mas o serviço de e-mail não está configurado.');
          }
        } catch (mailError) {
          console.error('[auth] Falha no envio do e-mail de recuperação:', mailError.message);
        }

        if (env.NODE_ENV === 'test') {
          responsePayload.debugResetToken = rawToken;
        }
      }

      return res.json(responsePayload);
    } catch (err) {
      return next(err);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await withTransaction(async (db) => {
        const { rows } = await db.query(
          `SELECT id, user_id, expires_at, used_at
           FROM password_reset_tokens
           WHERE token_hash = $1
           FOR UPDATE`,
          [tokenHash]
        );

        if (rows.length === 0) {
          const err = new Error('Token de recuperação inválido ou expirado.');
          err.statusCode = 400;
          throw err;
        }

        const resetRecord = rows[0];
        if (resetRecord.used_at || new Date(resetRecord.expires_at) < new Date()) {
          const err = new Error('Token de recuperação inválido ou expirado.');
          err.statusCode = 400;
          throw err;
        }

        const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);

        await db.query(
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
          [resetRecord.id]
        );

        await db.query(
          `UPDATE users
           SET password_hash = $1,
               must_change_password = FALSE,
               token_version = token_version + 1,
               password_changed_at = NOW()
           WHERE id = $2`,
          [newHash, resetRecord.user_id]
        );

        invalidateUserAuthCache(resetRecord.user_id);
      });

      return res.json({ message: 'Senha redefinida com sucesso.' });
    } catch (err) {
      return next(err);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { rows } = await query(
        'SELECT id, name, email, role, password_hash, active FROM users WHERE id = $1',
        [req.user.id]
      );

      if (rows.length === 0 || !rows[0].active) {
        return res.status(401).json({ message: 'Usuário inativo ou inexistente.' });
      }

      const user = rows[0];
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ message: 'A senha atual está incorreta.' });
      }

      const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
      const updated = await query(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = FALSE,
             token_version = token_version + 1,
             password_changed_at = NOW()
         WHERE id = $2
         RETURNING id, name, email, role, token_version`,
        [newHash, user.id]
      );

      invalidateUserAuthCache(user.id);
      const token = signAdminToken(updated.rows[0]);

      return res.json({
        message: 'Senha alterada com sucesso.',
        token,
      });
    } catch (err) {
      return next(err);
    }
  },

  // Renovação deslizante: exige token ainda válido e respeita um teto absoluto de sessão.
  refresh: async (req, res, next) => {
    try {
      const authAt = req.tokenClaims?.authAt;
      const nowSec = Math.floor(Date.now() / 1000);
      if (!authAt || nowSec - authAt > MAX_SESSION_SECONDS) {
        return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
      }
      const { rows } = await query(
        'SELECT id, name, email, role, active, token_version FROM users WHERE id = $1',
        [req.user.id]
      );
      if (rows.length === 0 || !rows[0].active) {
        return res.status(401).json({ message: 'Usuário inativo ou inexistente.' });
      }
      return res.json({ token: signAdminToken(rows[0], { authAt }) });
    } catch (err) {
      return next(err);
    }
  },

  getProfile: async (req, res, next) => {
    try {
      const { rows } = await query(
        'SELECT id, name, email, role, active, must_change_password FROM users WHERE id = $1',
        [req.user.id]
      );
      if (rows.length === 0 || !rows[0].active) {
        return res.status(401).json({ message: 'Usuário inativo ou inexistente.' });
      }
      const u = rows[0];
      return res.json({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          mustChangePassword: Boolean(u.must_change_password),
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  listUsers: async (req, res, next) => {
    try {
      const { rows } = await query(
        'SELECT id, name, email, role, active, must_change_password, created_at FROM users ORDER BY created_at ASC'
      );
      return res.json({ users: rows });
    } catch (err) {
      return next(err);
    }
  },

  createUser: async (req, res, next) => {
    try {
      const { name, email, role, password } = req.body;
      const temporaryPassword = password ? null : generateRandomTemporaryPassword();
      const rawPassword = password || temporaryPassword;
      const mustChangePassword = !password;

      const hash = await bcrypt.hash(rawPassword, BCRYPT_COST);
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash, role, active, must_change_password)
         VALUES ($1, LOWER($2), $3, $4, TRUE, $5)
         RETURNING id, name, email, role, active, must_change_password`,
        [name, email, hash, role, mustChangePassword]
      );

      const response = { user: rows[0] };
      if (temporaryPassword) {
        response.temporaryPassword = temporaryPassword;
      }

      return res.status(201).json(response);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Já existe um usuário cadastrado com este e-mail.' });
      }
      return next(err);
    }
  },

  toggleUserStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (String(req.user.id) === String(id)) {
        return res.status(400).json({ message: 'Você não pode desativar a sua própria conta.' });
      }

      const updatedUser = await withTransaction(async (db) => {
        const targetRes = await db.query(
          'SELECT id, role, active FROM users WHERE id = $1 FOR UPDATE',
          [id]
        );

        if (targetRes.rows.length === 0) {
          const notFoundErr = new Error('Usuário não encontrado.');
          notFoundErr.statusCode = 404;
          throw notFoundErr;
        }

        const target = targetRes.rows[0];
        const nextActive = typeof active === 'boolean' ? active : !target.active;

        if (target.role === 'ADMIN' && target.active && nextActive === false) {
          const activeAdminsRes = await db.query(
            `SELECT COUNT(*)::int AS total
             FROM users
             WHERE role = 'ADMIN' AND active = TRUE AND id <> $1`,
            [id]
          );

          if (activeAdminsRes.rows[0].total === 0) {
            const lastAdminErr = new Error('Não é possível desativar o último administrador ativo.');
            lastAdminErr.statusCode = 400;
            throw lastAdminErr;
          }
        }

        const { rows } = await db.query(
          `UPDATE users
           SET active = $2,
               token_version = token_version + 1
           WHERE id = $1
           RETURNING id, name, email, role, active`,
          [id, nextActive]
        );

        return rows[0];
      });

      invalidateUserAuthCache(id);
      return res.json({ user: updatedUser });
    } catch (err) {
      return next(err);
    }
  },
};