// Augment Express types for our JWT auth flow without conflicting with Passport
import 'express';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      id: string;
    }

    interface Request {
      cookies?: Record<string, string>;
    }
  }
}

export {};

