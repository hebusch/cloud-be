import express, { Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { RequestWithUser } from '../types/user';
import prisma from '../db/prisma';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import upload from '../services/uploadService';
import { deleteFile } from '../services/file';

config();
const router = express.Router();

router.post(
  '/upload',
  authMiddleware,
  upload.array('files'),
  async (req: Request, res: Response) => {
    try {
      const { folderId } = req.body;
      const files = req.files as Express.Multer.File[];
      const user = (req as RequestWithUser).user;

      if (!folderId || !files || files.length === 0) {
        res.status(400).json({ message: 'Invalid request' });
        return;
      }

      const folder = await prisma.folder.findUnique({
        where: {
          id: folderId,
          userId: user.id,
        },
      });

      if (!folder) {
        res.status(404).json({ message: 'Folder not found' });
        return;
      }

      const fileResponses = [];

      for (const file of files) {
        const fileRecord = await prisma.file.create({
          data: {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            folder: { connect: { id: folderId } },
            user: { connect: { id: user.id } },
          },
        });

        const newFilename = `${fileRecord.id}${path.extname(file.originalname)}`;
        fs.renameSync(file.path, path.join(process.env.UPLOAD_DIR || 'uploads', newFilename));

        fileResponses.push({
          id: fileRecord.id,
          name: fileRecord.name,
          size: fileRecord.size,
        });
      }

      res.status(201).json({ message: 'Files uploaded successfully', files: fileResponses });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Something went wrong' });
      }
    }
  },
);

router.delete('/:fileId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    const user = (req as RequestWithUser).user;

    const file = await prisma.file.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    if (file.userId !== user.id) {
      res.status(403).json({ message: 'You are not allowed to access this file' });
      return;
    }

    await prisma.file.delete({
      where: {
        id: fileId,
      },
    });

    await deleteFile(`${file.id}${path.extname(file.name)}`);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.put('/move/:fileId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    const { targetFolderId } = req.body;

    const user = (req as RequestWithUser).user;

    if (!targetFolderId) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file || file.userId !== user.id) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const folder = await prisma.folder.findUnique({ where: { id: targetFolderId } });

    if (!folder || folder.userId !== user.id) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    if (file.folderId === targetFolderId) {
      res.status(400).json({ message: 'File is already in this folder' });
      return;
    }

    await prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        folder: {
          connect: {
            id: targetFolderId,
          },
        },
      },
    });

    res.status(200).json({ message: 'File moved successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

export default router;
