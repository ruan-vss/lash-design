import { z } from 'zod';

export const clientBookingSchema = z.object({
  fullName: z.string().min(3, 'Informe seu nome completo (mínimo 3 caracteres).'),
  phone: z
    .string()
    .min(14, 'Informe um WhatsApp válido com DDD.')
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato inválido. Use (99) 99999-9999.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  notes: z.string().max(400, 'Máximo de 400 caracteres.').optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar a política de cancelamento e termos.' }),
  }),
  whatsappConsent: z.boolean().default(true),
});

export const lookupBookingSchema = z.object({
  bookingCode: z.string().min(4, 'Informe o código da reserva.'),
  phone: z.string().min(10, 'Informe o telefone utilizado no agendamento.'),
});

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha possui no mínimo 6 caracteres.'),
});

export const serviceFormSchema = z.object({
  name: z.string().min(3, 'Nome obrigatório.'),
  category: z.string().min(2, 'Categoria obrigatória.'),
  description: z.string().min(10, 'Descreva o procedimento com ao menos 10 caracteres.'),
  price: z.coerce.number().positive('O preço deve ser maior que zero.'),
  durationMinutes: z.coerce.number().int().min(15, 'Mínimo de 15 minutos.'),
  prepTimeMinutes: z.coerce.number().int().min(0, 'Não pode ser negativo.'),
  depositType: z.enum(['FIXED', 'PERCENTAGE', 'NONE']),
  depositValue: z.coerce.number().min(0, 'Valor inválido.'),
  guidelines: z.string().optional(),
  maintenanceRules: z.string().optional(),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  active: z.boolean().default(true),
});

export const promoFormSchema = z.object({
  code: z.string().min(3, 'Código obrigatório').toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.coerce.number().positive('Informe um valor positivo'),
  validUntil: z.string().min(1, 'Informe a data limite'),
  maxUses: z.coerce.number().int().positive('Mínimo de 1 uso'),
  active: z.boolean().default(true),
});

export const manualBookingSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(3, 'Nome da cliente obrigatório'),
  clientPhone: z.string().min(14, 'Telefone obrigatório'),
  serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço'),
  date: z.string().min(1, 'Data obrigatória'),
  startTime: z.string().min(1, 'Horário obrigatório'),
  status: z.enum(['CONFIRMED', 'PENDING_APPROVAL']),
  internalNotes: z.string().optional(),
});