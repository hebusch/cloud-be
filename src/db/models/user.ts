import { User } from '@prisma/client';
import { SafeUser } from '../../types/user';

export function safeReturnUser(user: User): SafeUser {
  const { id, name, email, createdAt, updatedAt } = user;
  return {
    id,
    name: name || '',
    email,
    createdAt,
    updatedAt,
  };
}
