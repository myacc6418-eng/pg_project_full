import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../../../packages/shared/types';
import { db } from '../shared/db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'pgfinder-dev-access-secret-2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pgfinder-dev-refresh-secret-2026';

export interface AuthPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '2h' });
}

export function signRefreshToken(payload: AuthPayload & { jti: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): (AuthPayload & { jti: string }) | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as AuthPayload & { jti: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as AuthPayload;
    const user = db.getState().users.find((u) => u.id === decoded.sub);
    if (!user || user.isSuspended) {
      res.status(403).json({ error: 'Account unavailable or suspended' });
      return;
    }
    req.auth = { sub: user.id, role: user.role, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET) as AuthPayload;
      const user = db.getState().users.find((u) => u.id === decoded.sub && !u.isSuspended);
      if (user) {
        req.auth = { sub: user.id, role: user.role, email: user.email };
      }
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
}
