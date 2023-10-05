import prisma from '../prisma';
import { Folder } from '@prisma/client';

interface FolderWithFiles extends Folder {
  files: {
    id: string;
    name: string;
  }[];
}

export async function getAllNestedFilesAndFolders(folderId: string): Promise<FolderWithFiles[]> {
  const folder = await prisma.folder.findUnique({
    where: {
      id: folderId,
    },
    include: {
      files: true,
      children: false,
    },
  });

  const folderChildren = await prisma.folder.findUnique({
    where: {
      id: folderId,
    },
    include: {
      children: true,
    },
  });

  if (!folder) {
    return [];
  }

  if (!folderChildren) {
    return [];
  }

  const result: FolderWithFiles[] = [folder];

  if (folderChildren.children) {
    for (const childFolder of folderChildren.children) {
      const nestedFolders = await getAllNestedFilesAndFolders(childFolder.id);
      result.push(...nestedFolders);
    }
  }

  return result;
}
