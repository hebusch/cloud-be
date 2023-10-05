import express, { Response, Request, json } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import authRouter from './routes/auth';
import folderRouter from './routes/folder';
import fileRouter from './routes/file';
import prisma from './db/prisma';

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());
app.use('/auth', authRouter);
app.use('/folder', folderRouter);
app.use('/file', fileRouter);

app.get('/health', (req: Request, res: Response) => {
  res.status(204).send();
});

app.listen(PORT, () => {
  // check if prisma is connected to the database
  prisma.$connect();
  console.log(`> Prisma connected to database`);
  console.log(`> Running at: http://localhost:${PORT}`);
});
