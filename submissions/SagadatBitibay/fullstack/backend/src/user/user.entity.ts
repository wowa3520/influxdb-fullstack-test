export interface User {
    id: string;
    email: string;
    password: string;
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export type UserWithoutPassword = Omit<User, 'password' | 'refreshToken'>;
  export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'refreshToken'>;
  