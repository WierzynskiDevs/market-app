import { Market } from '../models';

export const MARKETS_MOCK: Market[] = [
  {
    id: 'market-a',
    name: 'Mercado A',
    description: 'Seu mercado de confiança com produtos frescos',
    adminId: 'admin-a',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'market-b',
    name: 'Mercado B',
    description: 'Os melhores preços da região',
    adminId: 'admin-b',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'market-c',
    name: 'Mercado C',
    description: 'Qualidade e variedade em um só lugar',
    adminId: 'admin-c',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];
