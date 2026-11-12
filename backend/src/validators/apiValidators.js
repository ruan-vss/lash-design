import { z } from 'zod';

const uuid = z.string().uuid('ID inválido.');
// Lista de UUIDs separados por vírgula (querystring), máx. 10.
const uuidCsv = z.string().max(400).refine(
  (v) => v === '' || (v.split(',').length <= 10 && v.split(',').every((x) => z.string().uuid().safeParse(x).success)),
  'serviceIds inválido.'
);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use YYYY-MM-DD.').refine((v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, 'Data inexistente.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido. Use HH:mm.');
const phone = z.string().trim().min(8).max(30).regex(/^[+()\-\s\d]+$/, 'Telefone inválido.');
const shortText = z.string().trim().max(300);
const longText = z.string().trim().max(4000);
const bookingStatus = z.enum(['PENDING_APPROVAL', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
const paymentStatus = z.enum(['PENDING', 'PAID', 'REFUNDED', 'CANCELLED']);
const paymentMethod = z.enum(['CASH', 'CREDIT_CARD', 'ADMIN_AUDIT']);

// Query strings opcionais chegam como '' quando um select/filtro está em 'Todos'.
// Normalizamos string vazia para undefined antes de validar enums e datas.
const optionalQuery = (schema) =>
  z.preprocess((value) => ((typeof value === 'string' && value.trim() === '') || value === null ? undefined : value), schema.optional());
const optionalDateQuery = optionalQuery(date);
const idParams = { params: z.object({ id: uuid }) };

export const publicSchemas = {
  calendar: {
    query: z.object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
      serviceIds: uuidCsv.default('')
    })
  },
  slots: {
    query: z.object({ date, serviceIds: uuidCsv.refine((v) => v.length > 0, 'Informe os serviços.') })
  },
  preview: {
    body: z.object({
      serviceIds: z.array(uuid).min(1).max(10),
      couponCode: z.string().trim().max(40).optional().nullable()
    })
  },
  createBooking: {
    body: z.object({
      serviceIds: z.array(uuid).min(1).max(10),
      date,
      startTime: time,
      couponCode: z.string().trim().max(40).optional().nullable(),
      client: z.object({
        fullName: z.string().trim().min(2).max(150),
        phone,
        email: z.string().trim().email().max(150).optional().nullable().or(z.literal('')),
        whatsappConsent: z.boolean().optional().default(false),
        notes: longText.optional().nullable()
      })
    })
  },
  lookup: {
    body: z.object({
      bookingCode: z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9-]+$/, 'Código de reserva inválido.'),
      phone
    })
  },
  bookingDetails: {
    params: z.object({ id: uuid }),
    query: z.object({ token: z.string().min(20).max(4096) })
  },
  cancelBooking: {
    params: z.object({ id: uuid }),
    body: z.object({ token: z.string().min(20).max(4096), reason: shortText.optional().nullable() })
  },
  rescheduleBooking: {
    params: z.object({ id: uuid }),
    body: z.object({ newDate: date, newStartTime: time, token: z.string().min(20).max(4096) })
  }
};

const serviceBody = z.object({
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(4000),
  price: z.coerce.number().positive().max(100000),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  prepTimeMinutes: z.coerce.number().int().min(0).max(240).optional(),
  depositType: z.enum(['PERCENTAGE', 'FIXED', 'NONE']),
  depositValue: z.coerce.number().min(0).max(100000).optional(),
  guidelines: longText.optional().nullable(),
  maintenanceRules: longText.optional().nullable(),
  imageUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  active: z.boolean().optional()
});

const scheduleDay = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: time,
  closeTime: time,
  breakStart: time.optional().nullable(),
  breakEnd: time.optional().nullable()
}).refine((v) => !v.isOpen || v.openTime < v.closeTime, { message: 'Horário de abertura deve ser anterior ao fechamento.' });

export const adminSchemas = {
  dashboard: {
    query: z.object({
      period: optionalQuery(z.enum(['TODAY', 'WEEK', 'MONTH', 'LAST_MONTH', 'CUSTOM'])).default('MONTH'),
      startDate: optionalDateQuery,
      endDate: optionalDateQuery
    }).refine((v) => v.period !== 'CUSTOM' || (v.startDate && v.endDate), {
      message: 'Informe a data inicial e final para o período personalizado.',
      path: ['startDate']
    }).refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: 'A data final deve ser igual ou posterior à inicial.',
      path: ['endDate']
    })
  },
  reports: {
    query: z.object({
      startDate: optionalDateQuery,
      endDate: optionalDateQuery
    }).refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: 'A data final deve ser igual ou posterior à inicial.',
      path: ['endDate']
    })
  },
  listBookings: {
    query: z.object({
      date: optionalDateQuery,
      viewMode: optionalQuery(z.enum(['DAY', 'WEEK', 'MONTH'])),
      status: optionalQuery(bookingStatus),
      search: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30)
    })
  },
  manualBooking: {
    body: z.object({
      clientName: z.string().trim().min(2).max(150),
      clientPhone: phone,
      serviceIds: z.array(uuid).min(1).max(10),
      date,
      startTime: time,
      status: z.enum(['PENDING_APPROVAL', 'CONFIRMED']).optional(),
      internalNotes: longText.optional().nullable()
    })
  },
  updateBookingStatus: {
    params: z.object({ id: uuid }),
    body: z.object({ status: bookingStatus, reason: shortText.optional().nullable(), internalNotes: longText.optional().nullable() })
  },
  bookingId: idParams,
  deposit: {
    params: z.object({ id: uuid }),
    body: z.object({ amount: z.coerce.number().positive().max(100000), method: z.enum(['CASH', 'CREDIT_CARD']), note: shortText.optional().nullable() })
  },
  transactions: {
    query: z.object({
      method: optionalQuery(paymentMethod),
      status: optionalQuery(paymentStatus),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    })
  },
  auditAdjustment: {
    params: z.object({ bookingId: uuid }),
    body: z.object({ amount: z.coerce.number().positive().max(100000), reason: z.string().trim().min(5).max(500) })
  },
  serviceCreate: { body: serviceBody },
  serviceUpdate: { params: z.object({ id: uuid }), body: serviceBody },
  serviceToggle: { params: z.object({ id: uuid }), body: z.object({ active: z.boolean() }) },
  clientList: { query: z.object({
    search: z.string().trim().max(120).default(''),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }) },
  clientId: idParams,
  clientNotes: { params: z.object({ id: uuid }), body: z.object({ internalNotes: longText.nullable().optional() }) },
  updateSettings: {
    body: z.object({
      studioName: z.string().trim().min(2).max(150).optional(),
      professionalName: z.string().trim().min(2).max(150).optional(),
      whatsapp: phone.optional().or(z.literal('')),
      address: z.string().trim().max(500).optional(),
      timezone: z.string().trim().min(3).max(60).optional(),
      cancellationPolicyText: longText.optional()
    })
  },
  workingHours: {
    body: z.object({
      schedule: z.array(scheduleDay).max(7).optional(),
      prepMinutes: z.coerce.number().int().min(0).max(240).optional(),
      minAdvanceHours: z.coerce.number().int().min(0).max(720).optional(),
      maxAdvanceDays: z.coerce.number().int().min(1).max(730).optional()
    })
  },
  blockingCreate: {
    body: z.object({ startDate: date, endDate: date, startTime: time.optional().nullable(), endTime: time.optional().nullable(), reason: z.string().trim().min(2).max(200) })
      .refine((v) => v.endDate >= v.startDate, { message: 'A data final deve ser igual ou posterior à inicial.', path: ['endDate'] })
      .refine((v) => (!v.startTime && !v.endTime) || (v.startTime && v.endTime && v.startTime < v.endTime), { message: 'Informe um intervalo de horário válido.', path: ['endTime'] })
  },
  idOnly: idParams,
  promotionCreate: {
    body: z.object({
      code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
      discountType: z.enum(['PERCENTAGE', 'FIXED']),
      discountValue: z.coerce.number().positive().max(100000),
      validUntil: date,
      maxUses: z.coerce.number().int().min(1).max(100000).optional()
    })
  },
  promotionToggle: { params: z.object({ id: uuid }), body: z.object({ active: z.boolean() }) },
  notificationsUpdate: {
    body: z.object({
      enabled: z.boolean(),
      templates: z.record(z.string().max(4000)).refine((obj) => Object.keys(obj).length <= 20, 'Muitos templates informados.')
    })
  },
  notificationTest: { body: z.object({ phone }) }
};
