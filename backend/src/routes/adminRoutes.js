import { Router } from 'express';
import { authenticateAdmin, authorizeRoles, requirePasswordChangeComplete } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, toggleUserStatusSchema } from '../validators/authValidators.js';
import { adminSchemas } from '../validators/apiValidators.js';
import { adminDashboardController } from '../controllers/adminDashboardController.js';
import { adminBookingController } from '../controllers/adminBookingController.js';
import { adminServiceController } from '../controllers/adminServiceController.js';
import { adminClientController } from '../controllers/adminClientController.js';
import { adminPaymentController } from '../controllers/adminPaymentController.js';
import { adminSettingsController } from '../controllers/adminSettingsController.js';
import { authController } from '../controllers/authController.js';

const router = Router();
router.use(authenticateAdmin);
router.use(requirePasswordChangeComplete);

// Dashboard operacional: todos os perfis internos.
router.get('/dashboard', validate(adminSchemas.dashboard), adminDashboardController.getOverview);

// Relatórios financeiros: somente administração.
router.get('/reports', authorizeRoles('ADMIN'), validate(adminSchemas.reports), adminDashboardController.getReports);
router.get('/reports/export', authorizeRoles('ADMIN'), validate(adminSchemas.reports), adminDashboardController.exportReportCsv);

// Agenda e reservas: operação diária para os três perfis.
router.get('/bookings', validate(adminSchemas.listBookings), adminBookingController.listBookings);
router.post('/bookings/manual', validate(adminSchemas.manualBooking), adminBookingController.createManualBooking);
router.patch('/bookings/:id/status', validate(adminSchemas.updateBookingStatus), adminBookingController.updateBookingStatus);
router.post('/bookings/:id/deposit', authorizeRoles('ADMIN', 'RECEPTIONIST'), validate(adminSchemas.deposit), adminPaymentController.registerDeposit);

// Catálogo: leitura geral; alteração por ADMIN/PROFESSIONAL.
router.get('/services', adminServiceController.listServices);
router.post('/services', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.serviceCreate), adminServiceController.createService);
router.put('/services/:id', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.serviceUpdate), adminServiceController.updateService);
router.patch('/services/:id/status', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.serviceToggle), adminServiceController.toggleServiceActive);
router.delete('/services/:id', authorizeRoles('ADMIN'), validate(adminSchemas.idOnly), adminServiceController.softDeleteService);

// Clientes: operação diária para os três perfis.
router.get('/clients', validate(adminSchemas.clientList), adminClientController.listClients);
router.get('/clients/:id', validate(adminSchemas.clientId), adminClientController.getClientDetails);
router.patch('/clients/:id/notes', validate(adminSchemas.clientNotes), adminClientController.updateClientNotes);

// Financeiro: ADMIN/RECEPTIONIST consultam; ajustes e exportações ficam restritos ao ADMIN.
router.get('/payments', authorizeRoles('ADMIN', 'RECEPTIONIST'), validate(adminSchemas.transactions), adminPaymentController.listTransactions);
router.get('/payments/export-csv', authorizeRoles('ADMIN'), validate(adminSchemas.transactions), adminPaymentController.exportCsv);
router.post('/payments/:bookingId/audit-adjustment', authorizeRoles('ADMIN'), validate(adminSchemas.auditAdjustment), adminPaymentController.createAuditAdjustment);

// Expediente e bloqueios: ADMIN/PROFESSIONAL. Promoções: ADMIN.
router.get('/availability/hours', authorizeRoles('ADMIN', 'PROFESSIONAL'), adminSettingsController.getWorkingHours);
router.put('/availability/hours', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.workingHours), adminSettingsController.updateWorkingHours);
router.get('/availability/blockings', authorizeRoles('ADMIN', 'PROFESSIONAL'), adminSettingsController.getBlockings);
router.post('/availability/blockings', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.blockingCreate), adminSettingsController.createBlocking);
router.delete('/availability/blockings/:id', authorizeRoles('ADMIN', 'PROFESSIONAL'), validate(adminSchemas.idOnly), adminSettingsController.deleteBlocking);

router.get('/promotions', authorizeRoles('ADMIN'), adminSettingsController.listPromotions);
router.post('/promotions', authorizeRoles('ADMIN'), validate(adminSchemas.promotionCreate), adminSettingsController.createPromotion);
router.patch('/promotions/:id', authorizeRoles('ADMIN'), validate(adminSchemas.promotionToggle), adminSettingsController.togglePromotion);

// Integrações e configuração global: somente ADMIN.
router.get('/notifications', authorizeRoles('ADMIN'), adminSettingsController.getNotificationsConfig);
router.put('/notifications/templates', authorizeRoles('ADMIN'), validate(adminSchemas.notificationsUpdate), adminSettingsController.updateNotificationsConfig);
router.post('/notifications/test', authorizeRoles('ADMIN'), validate(adminSchemas.notificationTest), adminSettingsController.testNotification);
router.get('/settings', authorizeRoles('ADMIN'), adminSettingsController.getSettings);
router.put('/settings', authorizeRoles('ADMIN'), validate(adminSchemas.updateSettings), adminSettingsController.updateSettings);

// Gestão de usuários internos: somente ADMIN.
router.get('/users', authorizeRoles('ADMIN'), authController.listUsers);
router.post('/users', authorizeRoles('ADMIN'), validate(createUserSchema), authController.createUser);
router.patch('/users/:id/status', authorizeRoles('ADMIN'), validate(toggleUserStatusSchema), authController.toggleUserStatus);

export default router;
