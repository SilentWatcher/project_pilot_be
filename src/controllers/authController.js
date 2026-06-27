import asyncHandler from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';
import { registerUser, loginUser, getCurrentUser, updateProfile } from '../services/authService.js';

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await registerUser({ name, email, password, role });
  sendResponse(res, 201, { user: result.user, token: result.token }, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  sendResponse(res, 200, { user: result.user, token: result.token }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  sendResponse(res, 200, null, 'Logged out successfully');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);
  sendResponse(res, 200, user, 'User fetched successfully');
});

const handleUpdateProfile = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user.id, req.body);
  sendResponse(res, 200, user, 'Profile updated successfully');
});

export { register, login, logout, getMe, handleUpdateProfile };
