import { User, UserRole } from '../models';

export const USERS_MOCK: User[] = [
  {
    id: 'customer-1',
    name: 'Cliente Comum',
    email: 'cliente@email.com',
    password: '123456',
    role: UserRole.CUSTOMER,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'admin-a',
    name: 'Admin Mercado A',
    email: 'admin.a@email.com',
    password: '123456',
    role: UserRole.ADMIN,
    marketId: 'market-a',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'admin-b',
    name: 'Admin Mercado B',
    email: 'admin.b@email.com',
    password: '123456',
    role: UserRole.ADMIN,
    marketId: 'market-b',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'admin-c',
    name: 'Admin Mercado C',
    email: 'admin.c@email.com',
    password: '123456',
    role: UserRole.ADMIN,
    marketId: 'market-c',
    createdAt: new Date('2024-01-01'),
  },
];
