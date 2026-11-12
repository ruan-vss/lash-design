import { Router } from 'express';
import { whatsappWebhookController } from '../controllers/whatsappWebhookController.js';

const router = Router();
router.get('/whatsapp', whatsappWebhookController.verify);
router.post('/whatsapp', whatsappWebhookController.receive);
export default router;
