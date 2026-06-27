import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import config from '../config/env.js';
import AppError from '../utils/AppError.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

const registerUser = async ({ name, email, password, role }) => {
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || 'member',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);

  return { user, token };
};

const loginUser = async ({ email, password }) => {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

const getCurrentUser = async (userId) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const updateProfile = async (userId, data) => {
  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.email) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing && String(existing.id) !== String(userId)) {
      throw new AppError('Email already in use', 400);
    }
    updateData.email = data.email;
  }
  if (data.password) {
    const salt = await bcrypt.genSalt(12);
    updateData.password = await bcrypt.hash(data.password, salt);
  }

  const user = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return user;
};

export { registerUser, loginUser, getCurrentUser, updateProfile };
