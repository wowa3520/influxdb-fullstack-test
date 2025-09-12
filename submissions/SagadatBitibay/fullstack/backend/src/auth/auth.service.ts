import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { UserWithoutPassword } from '../user/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password } = registerDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = await this.userService.createUser({ email, password });
    const tokens = await this.generateTokens(user.id, user.email);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
    await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
    await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const user = await this.userService.findByEmail(payload.email);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!refreshTokenMatches) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email);

      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 12);
      await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, refreshToken: __, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
