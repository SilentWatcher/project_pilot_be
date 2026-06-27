import asyncHandler from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';
import { registerUser, loginUser, getCurrentUser, updateProfile } from '../services/authService.js';
import config from '../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setTokenCookie = (res, token) => {
  res.cookie('token', token, cookieOptions);
};

const clearTokenCookie = (res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await registerUser({ name, email, password, role });
  setTokenCookie(res, result.token);
  sendResponse(res, 201, { user: result.user }, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  setTokenCookie(res, result.token);
  sendResponse(res, 200, { user: result.user }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
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
