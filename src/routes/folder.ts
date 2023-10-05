import express, { Request, Response } from 'express';
import prisma from '../db/prisma';
import path from 'path';
import { getAllNestedFilesAndFolders } from '../db/models/folder';
import { authMiddleware } from '../middlewares/auth';
import { RequestWithUser } from '../types/user';
import { deleteFile } from '../services/file';

const router = express.Router();

router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const { folderName, parentFolderId } = req.body;

    if (!folderName || !parentFolderId) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    if (folderName === 'root') {
      res.status(400).json({ message: 'Invalid folder name' });
      return;
    }

    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: folderName,
        parentId: parentFolderId,
        userId: user.id,
      },
    });

    if (existingFolder) {
      res.status(409).json({ message: 'Folder already exists' });
      return;
    }

    const newFolder = await prisma.folder.create({
      data: {
        name: folderName,
        user: { connect: { id: user.id } },
        parent: { connect: { id: parentFolderId } },
      },
    });

    res.status(201).json({ message: 'Folder created successfully', folder: newFolder });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.get('/:folderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const user = (req as RequestWithUser).user;

    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        children: true,
        files: true,
      },
    });

    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    if (folder.userId !== user.id) {
      res.status(403).json({ message: 'You are not allowed to access this folder' });
      return;
    }

    res.status(200).json({ folder });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.put('/move/:folderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { targetFolderId } = req.body;

    const user = (req as RequestWithUser).user;

    if (!targetFolderId) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== user.id) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    if (folder.name === 'root' && folder.parentId === null) {
      res.status(400).json({ message: 'Cannot move root folder' });
      return;
    }

    const targetFolder = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!targetFolder || targetFolder.userId !== user.id) {
      res.status(404).json({ message: 'Target folder not found' });
      return;
    }

    if (folder.parentId === targetFolder.id) {
      res.status(400).json({ message: 'Folder is already in target folder' });
      return;
    }

    const nestedFolders = await getAllNestedFilesAndFolders(folderId);

    if (nestedFolders.find((nestedFolder) => nestedFolder.id === targetFolderId)) {
      res.status(400).json({ message: 'Cannot move folder to its own subfolder' });
      return;
    }

    await prisma.folder.update({
      where: { id: folderId },
      data: {
        parent: { connect: { id: targetFolderId } },
      },
    });

    res.status(200).json({ message: 'Folder moved successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

router.delete('/:folderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const folderId = req.params.folderId;
    const user = (req as RequestWithUser).user;

    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
      },
    });

    if (!folder || folder.userId !== user.id) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    if (folder.name === 'root' && folder.parentId === null) {
      res.status(400).json({ message: 'Cannot delete root folder' });
      return;
    }

    const nestedFolders = await getAllNestedFilesAndFolders(folderId);

    for (const nestedFolder of nestedFolders) {
      if (nestedFolder.files) {
        for (const file of nestedFolder.files) {
          await deleteFile(`${file.id}${path.extname(file.name)}`);
          await prisma.file.delete({
            where: {
              id: file.id,
            },
          });
        }
      }
      await prisma.folder.delete({
        where: {
          id: nestedFolder.id,
        },
      });
    }

    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

export default router;
