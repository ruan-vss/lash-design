import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

const emailAttempts = new Map();

// Limpeza periódica de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailAttempts.entries()) {
    if (entry.resetAt <= now) {
      emailAttempts.delete(key);
    }
  }
}, 60 * 1000).unref();

export const loginIpRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: true,
    message: 'Muitas tentativas de login a partir deste IP. Tente novamente em 15 minutos.'
  }
});

export const loginEmailRateLimiter = async (req, res, next) => {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!rawEmail) return next();

  const now = Date.now();
  let record = emailAttempts.get(rawEmail);

  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
    emailAttempts.set(rawEmail, record);
  }

  if (record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: true,
      message: 'Conta temporariamente bloqueada por excesso de tentativas. Aguarde 15 minutos.'
    });
  }

  // Atraso progressivo a partir da 2ª falha
  if (record.count > 1) {
    const delayMs = Math.min(2000, (record.count - 1) * 300);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return next();
};

export const registerLoginFailure = (email) => {
  if (!email) return;
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const record = emailAttempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  record.count += 1;
  emailAttempts.set(key, record);
};

export const clearLoginFailures = (email) => {
  if (!email) return;
  emailAttempts.delete(email.trim().toLowerCase());
};