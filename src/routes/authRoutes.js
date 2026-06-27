import express from 'express';
const router = express.Router();
import { register, login, logout, getMe, handleUpdateProfile } from '../controllers/authController.js';
import { registerValidator, loginValidator, updateProfileValidator } from '../validators/authValidator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidator, validate, handleUpdateProfile);

export default router;
