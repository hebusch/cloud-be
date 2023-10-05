import { Router, Response, Request } from 'express';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { authMiddleware } from '../middlewares/auth';
import { RequestWithUser } from '../types/user';

config();
const router = Router();

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || '');

    const rootUserFolder = await prisma.folder.findFirst({
      where: {
        name: 'root',
        userId: user.id,
      },
    });

    res.status(200).json({ message: 'Logged in successfully', token, rootUserFolder });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      res.status(409).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || '',
        folders: {
          create: {
            name: 'root',
          },
        },
      },
    });

    res.status(201).send();
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

export default router;
