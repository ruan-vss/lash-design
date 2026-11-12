import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/authValidators.js';
import {
  loginIpRateLimiter,
  loginEmailRateLimiter,
} from '../middlewares/loginRateLimiter.js';

const router = Router();

router.post(
  '/login',
  loginIpRateLimiter,
  validate(loginSchema),
  loginEmailRateLimiter,
  authController.login
);

router.post(
  '/forgot-password',
  loginIpRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  loginIpRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/change-password',
  authenticateAdmin,
  validate(changePasswordSchema),
  authController.changePassword
);

router.post('/refresh', authenticateAdmin, authController.refresh);
router.get('/me', authenticateAdmin, authController.getProfile);

export default router;