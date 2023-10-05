import { Request } from 'express';

export interface IJwetPayload {
  id: string;
}

export interface RequestWithUser extends Request {
  user: SafeUser;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
