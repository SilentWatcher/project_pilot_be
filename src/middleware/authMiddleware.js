import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { sendError } from '../utils/response.js';
import config from '../config/env.js';

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authorized, no token provided');
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return sendError(res, 401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized, token invalid');
  }
};

export { protect };
