import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestContext, requestLogger } from './middlewares/requestLogger.js';

const app = express();

// Não confia em proxies por padrão. Em produção, configure TRUST_PROXY=1 (ou valor compatível
// com sua infraestrutura) para que req.ip e rate limit usem o IP real sem aceitar spoofing.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(requestContext);
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use('/api/', apiLimiter);

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Rota não encontrada.', requestId: req.requestId });
});
app.use(errorHandler);

export default app;
