import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

export default prisma;
