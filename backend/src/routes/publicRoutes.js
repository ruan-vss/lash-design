import { Router } from 'express';
import { publicController } from '../controllers/publicController.js';
import { validate } from '../middlewares/validate.js';
import {
  availabilityLimiter,
  previewLimiter,
  createBookingLimiter,
  bookingAccessLimiter,
} from '../middlewares/publicRateLimiters.js';
import { publicSchemas } from '../validators/apiValidators.js';

const router = Router();

router.get('/studio', publicController.getStudioConfig);
router.get('/services', publicController.getPublicServices);
router.get('/availability/calendar', availabilityLimiter, validate(publicSchemas.calendar), publicController.getMonthlyAvailability);
router.get('/availability/slots', availabilityLimiter, validate(publicSchemas.slots), publicController.getAvailableSlots);

router.post('/bookings/preview', previewLimiter, validate(publicSchemas.preview), publicController.previewBooking);
router.post('/bookings', createBookingLimiter, validate(publicSchemas.createBooking), publicController.createBooking);
router.post('/bookings/lookup', bookingAccessLimiter, validate(publicSchemas.lookup), publicController.lookupClientBookings);
router.get('/bookings/:id', bookingAccessLimiter, validate(publicSchemas.bookingDetails), publicController.getClientBookingDetails);
router.post('/bookings/:id/cancel', bookingAccessLimiter, validate(publicSchemas.cancelBooking), publicController.cancelClientBooking);
router.post('/bookings/:id/reschedule', bookingAccessLimiter, validate(publicSchemas.rescheduleBooking), publicController.rescheduleClientBooking);

export default router;
