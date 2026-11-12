import { Router } from 'express';
import publicRoutes from './publicRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import webhookRoutes from './webhookRoutes.js';

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);

export default router;