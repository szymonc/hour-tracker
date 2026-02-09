import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User, UserRole, AuthProvider } from '../users/entities/user.entity';
import { OneTimeToken } from './entities/one-time-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(OneTimeToken)
    private readonly oneTimeTokenRepository: Repository<OneTimeToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string }> {
    // Check if email exists
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Validate password strength
    if (!this.isPasswordStrong(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters with uppercase, lowercase, and number',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = this.usersRepository.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash,
      authProvider: AuthProvider.LOCAL,
      role: UserRole.USER,
    });

    await this.usersRepository.save(user);

    const accessToken = this.generateAccessToken(user);

    return { user, accessToken };
  }

  async login(dto: LoginDto): Promise<{ user: User; accessToken: string }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.authProvider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException('Please sign in with Google');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const accessToken = this.generateAccessToken(user);

    return { user, accessToken };
  }

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      // Check if email exists with local auth
      const existingByEmail = await this.usersRepository.findOne({
        where: { email: profile.email.toLowerCase() },
      });

      if (existingByEmail) {
        // Link Google account to existing user
        existingByEmail.googleId = profile.googleId;
        existingByEmail.authProvider = AuthProvider.GOOGLE;
        user = await this.usersRepository.save(existingByEmail);
      } else {
        // Create new user
        user = this.usersRepository.create({
          email: profile.email.toLowerCase(),
          name: profile.name,
          googleId: profile.googleId,
          authProvider: AuthProvider.GOOGLE,
          role: UserRole.USER,
        });
        await this.usersRepository.save(user);
      }
    }

    return user;
  }

  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    };

    return this.jwtService.sign(payload);
  }

  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  async validateRefreshToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createOneTimeToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const oneTimeToken = this.oneTimeTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    await this.oneTimeTokenRepository.save(oneTimeToken);
    return token;
  }

  async validateOneTimeToken(token: string): Promise<User | null> {
    // Atomic update: only marks as used if not already used and not expired
    const result = await this.oneTimeTokenRepository
      .createQueryBuilder()
      .update(OneTimeToken)
      .set({ used: true, usedAt: new Date() })
      .where('token = :token AND used = false AND "expiresAt" > :now', {
        token,
        now: new Date(),
      })
      .execute();

    if (result.affected === 0) {
      return null;
    }

    const oneTimeToken = await this.oneTimeTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!oneTimeToken?.user || !oneTimeToken.user.isActive) {
      return null;
    }

    return oneTimeToken.user;
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return (
      password.length >= minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber
    );
  }
}
