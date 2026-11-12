import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Lista de segredos vazados no zip original ou placeholders comuns que devem ser bloqueados
const COMPROMISED_OR_WEAK_SECRETS = new Set([
  'super_secret_jwt_key_lash_studio_2025_!@#',
  'segredo_para_consulta_publica_clientes_2025',
  'secret',
  'jwt_secret',
  'changeme',
  '12345678901234567890123456789012'
]);

const isStrongSecret = (val) => {
  const normalized = val.trim();
  if (COMPROMISED_OR_WEAK_SECRETS.has(normalized)) return false;
  if (/^(.)\1+$/.test(normalized)) return false; // Rejeita caracteres repetidos (ex: "aaaa...")
  if (/^(placeholder|secret|key|token|senha|mudar)/i.test(normalized)) return false;
  return true;
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_URL: z.string().url('FRONTEND_URL deve ser uma URL válida (ex: http://localhost:5173)'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória').refine(
    (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
    { message: 'DATABASE_URL deve começar com postgres:// ou postgresql://' }
  ),
  DB_SSL: z.enum(['true', 'false']).default('false').transform((val) => val === 'true'),

  TRUST_PROXY: z.string().default('false').transform((value, ctx) => {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
    if (normalized === 'true') return true;
    if (['loopback', 'linklocal', 'uniquelocal'].includes(normalized)) return normalized;
    if (/^[1-9]\d*$/.test(normalized)) return Number(normalized);
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TRUST_PROXY inválido. Use false, true, loopback ou número de proxies.' });
    return z.NEVER;
  }),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres (recomendado: openssl rand -hex 64)')
    .refine(isStrongSecret, {
      message: 'JWT_SECRET contém um valor comprometido, placeholder ou fraco. Gere um novo com: openssl rand -hex 64'
    }),

  JWT_EXPIRES_IN: z.string().default('15m'),

  CLIENT_LOOKUP_SECRET: z
    .string()
    .min(32, 'CLIENT_LOOKUP_SECRET deve ter no mínimo 32 caracteres (recomendado: openssl rand -hex 64)')
    .refine(isStrongSecret, {
      message: 'CLIENT_LOOKUP_SECRET contém um valor comprometido, placeholder ou fraco. Gere um novo com: openssl rand -hex 64'
    }),

  // Variáveis usadas pelo seed.js (P0-4)
  SEED_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional().or(z.literal('')),

  // Recuperação de senha por e-mail via API HTTP (sem dependência SMTP adicional).
  RESEND_API_KEY: z.string().min(10).optional().or(z.literal('')),
  EMAIL_FROM: z.string().email().optional().or(z.literal('')),
  PASSWORD_RESET_URL: z.string().url().optional().or(z.literal('')),

  // WhatsApp Cloud API (Meta). O sistema continua inicializando sem credenciais; apenas os envios ficam indisponíveis.
  WHATSAPP_GRAPH_API_BASE: z.string().url().default('https://graph.facebook.com'),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v22.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/).optional().or(z.literal('')),
  WHATSAPP_ACCESS_TOKEN: z.string().min(20).optional().or(z.literal('')),
  WHATSAPP_VERIFY_TOKEN: z.string().min(12).optional().or(z.literal('')),
  WHATSAPP_APP_SECRET: z.string().min(16).optional().or(z.literal('')),
  WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,4}$/).default('55'),
  WHATSAPP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000)
})
.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production' && data.WHATSAPP_ACCESS_TOKEN && !data.WHATSAPP_APP_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'WHATSAPP_APP_SECRET é obrigatório em produção quando o WhatsApp está configurado.',
      path: ['WHATSAPP_APP_SECRET']
    });
  }
  // 1. Segredos nunca podem ser iguais (impede escalonamento de privilégio cliente -> admin)
  if (data.JWT_SECRET === data.CLIENT_LOOKUP_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CLIENT_LOOKUP_SECRET deve ser estritamente diferente de JWT_SECRET.',
      path: ['CLIENT_LOOKUP_SECRET']
    });
  }
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ [FATAL] Falha crítica na validação das variáveis de ambiente:');
    for (const issue of parsed.error.issues) {
      console.error(`   -> [${issue.path.join('.') || 'ENV'}]: ${issue.message}`);
    }
    process.exit(1);
  }

  return Object.freeze(parsed.data);
};

export const env = parseEnv();