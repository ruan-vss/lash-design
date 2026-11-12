import { z } from 'zod';

export const ROLES_ENUM = ['ADMIN', 'PROFESSIONAL', 'RECEPTIONIST'];

export const strongPasswordSchema = z
  .string()
  .min(12, 'A senha deve ter no mínimo 12 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula.')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula.')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um caractere especial.');

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(150),
    password: z.string().min(1, 'A senha é obrigatória.').max(128)
  }).strict()
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(150)
  }).strict()
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().trim().min(32, 'Token de recuperação inválido.').max(256),
    newPassword: strongPasswordSchema
  }).strict()
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'A senha atual é obrigatória.').max(128),
    newPassword: strongPasswordSchema
  }).strict().refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha deve ser diferente da senha atual.',
    path: ['newPassword']
  })
};

export const createUserSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Nome é obrigatório (mínimo 2 caracteres).').max(150),
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(150),
    password: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      strongPasswordSchema.optional()
    ),
    role: z.enum(ROLES_ENUM, {
      errorMap: () => ({ message: 'Papel inválido. Use ADMIN, PROFESSIONAL ou RECEPTIONIST.' })
    })
  }).strict()
};

export const toggleUserStatusSchema = {
  params: z.object({
    id: z.string().uuid('ID de usuário inválido.')
  }).strict(),
  body: z.object({
    active: z.boolean().optional()
  }).strict()
};