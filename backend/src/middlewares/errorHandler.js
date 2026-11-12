import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: true,
      message: 'Erro de validação nos dados enviados.',
      requestId: req.requestId,
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const publicMessage = statusCode === 500
    ? 'Erro interno no servidor ao processar a solicitação.'
    : err.message;

  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    event: 'api_error',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl?.split('?')[0],
    status: statusCode,
    userId: req.user?.id || null,
    errorName: err.name,
    errorMessage: err.message,
    ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  }));

  return res.status(statusCode).json({ error: true, message: publicMessage, requestId: req.requestId });
};
