export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  marketId?: string; // Só para admins
  createdAt: Date;
}
