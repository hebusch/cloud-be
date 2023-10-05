import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import prisma from '../db/prisma';
import { IJwetPayload, RequestWithUser, SafeUser } from '../types/user';
import { safeReturnUser } from '../db/models/user';

config();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || '') as IJwetPayload;

    const user = await prisma.user.findUnique({ where: { id: decodedToken.id } });

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const safeUser: SafeUser = safeReturnUser(user);

    const reqWithUser = req as RequestWithUser;
    reqWithUser.user = safeUser;

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
};
