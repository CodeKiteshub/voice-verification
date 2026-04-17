import type { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  callLimit: number;   // -1 = unlimited; cached for UI display only
  callsUsed: number;   // cached; always re-read from DB before enforcement
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'vv_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
