import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserWithoutPassword, CreateUserData } from './user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  // В реальном приложении это будет база данных
  private users: User[] = [];

  constructor(private configService: ConfigService) {
    // Создаем дефолтного пользователя при запуске
    this.initDefaultUser();
  }

  private async initDefaultUser() {
    const defaultEmail = this.configService.get('DEFAULT_USER_EMAIL');
    const defaultPassword = this.configService.get('DEFAULT_USER_PASSWORD');

    if (defaultEmail && defaultPassword) {
      const existingUser = this.users.find(user => user.email === defaultEmail);
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        const defaultUser: User = {
          id: uuidv4(),
          email: defaultEmail,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.users.push(defaultUser);
        console.log(`Default user created: ${defaultEmail}`);
      }
    }
  }

  async createUser(userData: CreateUserData): Promise<UserWithoutPassword> {
    const existingUser = this.users.find(user => user.email === userData.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const newUser: User = {
      id: uuidv4(),
      email: userData.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(newUser);

    // Возвращаем пользователя без пароля
    const { password, refreshToken, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = this.users.find(user => user.id === id);
    if (!user) return null;

    const { password, refreshToken, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException('Пользователь не найден');
    }

    this.users[userIndex].refreshToken = refreshToken || undefined;
    this.users[userIndex].updatedAt = new Date();
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Для отладки - получить всех пользователей
  getAllUsers(): UserWithoutPassword[] {
    return this.users.map(user => {
      const { password, refreshToken, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }
}
