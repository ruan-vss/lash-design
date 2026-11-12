import crypto from 'crypto';

const safePath = (req) => req.originalUrl?.split('?')[0] || req.path || '/';

export const requestContext = (req, res, next) => {
  const requestId = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const payload = {
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: safePath(req),
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      ip: req.ip,
      userId: req.user?.id || null,
      role: req.user?.role || null,
      userAgent: req.get('user-agent')?.slice(0, 220) || null,
    };
    // Nunca registra body, Authorization, cookies ou query string para evitar vazamento de segredos/PII.
    console.log(JSON.stringify(payload));
  });
  next();
};
