import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export const JWT_ISSUER = 'lash-studio-api';
export const JWT_ADMIN_AUDIENCE = 'lash-studio-admin';
export const JWT_CLIENT_AUDIENCE = 'lash-studio-client';

const VALID_ROLES = new Set(['ADMIN', 'PROFESSIONAL', 'RECEPTIONIST']);

// Cache curto de 30s para evitar hit excessivo no banco, com invalidação imediata
const userAuthCache = new Map();
const CACHE_TTL_MS = 30 * 1000;

export const invalidateUserAuthCache = (userId) => {
  if (userId) {
    userAuthCache.delete(userId);
  } else {
    userAuthCache.clear();
  }
};

const getActiveUserFromDbOrCache = async (userId) => {
  const now = Date.now();
  const cached = userAuthCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const res = await query(
    `SELECT id, name, email, role, active, token_version, must_change_password
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const user = res.rows[0] || null;
  userAuthCache.set(userId, { user, expiresAt: now + CACHE_TTL_MS });
  return user;
};

/**
 * Assina token JWT administrativo com claims estritos
 */
export const MAX_SESSION_SECONDS = 8 * 60 * 60; // teto absoluto de sessão, mesmo com renovações

export const signAdminToken = (user, { authAt } = {}) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      typ: 'admin_access',
      scope: 'admin',
      tokenVersion: user.token_version ?? 0,
      authAt: authAt ?? Math.floor(Date.now() / 1000)
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN || '15m',
      issuer: JWT_ISSUER,
      audience: JWT_ADMIN_AUDIENCE,
      subject: String(user.id)
    }
  );
};

/**
 * Assina token JWT público de cliente (usado em createBooking e lookupClientBookings)
 * Usa exclusivamente CLIENT_LOOKUP_SECRET (sem fallback para JWT_SECRET)
 */
export const issueClientAccessToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      typ: 'client_lookup',
      scope: 'client:bookings'
    },
    env.CLIENT_LOOKUP_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: JWT_ISSUER,
      audience: JWT_CLIENT_AUDIENCE,
      subject: String(payload.clientId || payload.bookingId || 'client')
    }
  );
};

/**
 * Verifica token JWT público de cliente (usado em getClientBookingDetails, cancel e reschedule)
 */
export const verifyClientAccessToken = (token, bookingId, clientId) => {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = jwt.verify(token, env.CLIENT_LOOKUP_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_CLIENT_AUDIENCE
    });

    if (decoded.typ !== 'client_lookup' || decoded.scope !== 'client:bookings') {
      return false;
    }

    if (decoded.clientId && String(decoded.clientId) === String(clientId)) {
      if (!decoded.bookingId || String(decoded.bookingId) === String(bookingId)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Middleware para proteger rotas administrativas via JWT
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'Acesso negado. Token de autenticação não fornecido.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_ADMIN_AUDIENCE
    });

    if (
      decoded.typ !== 'admin_access' ||
      decoded.scope !== 'admin' ||
      !decoded.id ||
      !VALID_ROLES.has(decoded.role)
    ) {
      return res.status(401).json({
        error: true,
        message: 'Token inválido para acesso administrativo.'
      });
    }

    const dbUser = await getActiveUserFromDbOrCache(decoded.id);
    if (!dbUser || !dbUser.active) {
      return res.status(401).json({
        error: true,
        message: 'Usuário inativo ou inexistente. Sessão encerrada.'
      });
    }

    if ((decoded.tokenVersion ?? 0) !== (dbUser.token_version ?? 0)) {
      return res.status(401).json({
        error: true,
        message: 'Sessão expirada ou revogada. Faça login novamente.'
      });
    }

    req.tokenClaims = { authAt: Number(decoded.authAt ?? decoded.iat) };
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name,
      mustChangePassword: Boolean(dbUser.must_change_password)
    };

    return next();
  } catch {
    return res.status(401).json({
      error: true,
      message: 'Token inválido ou expirado. Faça login novamente.'
    });
  }
};

/**
 * Middleware para restringir acesso por função (Role)
 */

export const requirePasswordChangeComplete = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return res.status(428).json({
      error: true,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Você precisa alterar a senha temporária antes de acessar o painel.'
    });
  }
  return next();
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Permissão insuficiente para realizar esta ação.'
      });
    }
    return next();
  };
};