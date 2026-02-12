import { User } from '../models';
import { db } from './database.service';

export class AuthService {
  private currentUser: User | null = null;

  async login(email: string, password: string): Promise<User> {
    const user = db.getUserByEmail(email);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.password !== password) {
      throw new Error('Senha incorreta');
    }

    this.currentUser = user;
    return user;
  }

  logout(): void {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  isCustomer(): boolean {
    return this.currentUser?.role === 'CUSTOMER';
  }
}

export const authService = new AuthService();
