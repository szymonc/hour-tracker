import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { User, UserRole, AuthProvider } from '../users/entities/user.entity';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let jwtService: any;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    authProvider: AuthProvider.LOCAL,
    isActive: true,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'Password123',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue({ ...mockUser, ...registerDto });
      usersRepository.save.mockResolvedValue({ ...mockUser, ...registerDto, id: 'new-user-id' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerDto);

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email.toLowerCase(),
          name: registerDto.name,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.USER,
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const weakPasswordDto = { ...registerDto, password: 'weak' };
      await expect(service.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without uppercase', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const noUpperDto = { ...registerDto, password: 'password123' };
      await expect(service.register(noUpperDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without lowercase', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const noLowerDto = { ...registerDto, password: 'PASSWORD123' };
      await expect(service.register(noLowerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without number', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const noNumberDto = { ...registerDto, password: 'PasswordOnly' };
      await expect(service.register(noNumberDto)).rejects.toThrow(BadRequestException);
    });

    it('should lowercase the email', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue({ ...mockUser });
      usersRepository.save.mockResolvedValue({ ...mockUser });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const upperCaseDto = { ...registerDto, email: 'TEST@EXAMPLE.COM' };
      await service.register(upperCaseDto);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login successfully with valid credentials', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for Google auth user', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...mockUser,
        authProvider: AuthProvider.GOOGLE,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Please sign in with Google');
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account is deactivated');
    });

    it('should lowercase the email for lookup', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ ...loginDto, email: 'TEST@EXAMPLE.COM' });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('validateGoogleUser', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'google@example.com',
      name: 'Google User',
    };

    it('should return existing user with matching googleId', async () => {
      const existingGoogleUser = { ...mockUser, googleId: 'google-123' };
      usersRepository.findOne.mockResolvedValue(existingGoogleUser);

      const result = await service.validateGoogleUser(googleProfile);

      expect(result).toEqual(existingGoogleUser);
    });

    it('should create new user if no matching googleId or email', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue({
        ...googleProfile,
        authProvider: AuthProvider.GOOGLE,
      });
      usersRepository.save.mockResolvedValue({
        id: 'new-id',
        ...googleProfile,
        authProvider: AuthProvider.GOOGLE,
      });

      const result = await service.validateGoogleUser(googleProfile);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: googleProfile.email.toLowerCase(),
          name: googleProfile.name,
          googleId: googleProfile.googleId,
          authProvider: AuthProvider.GOOGLE,
        }),
      );
      expect(result.authProvider).toBe(AuthProvider.GOOGLE);
    });

    it('should link Google account to existing email user', async () => {
      const existingLocalUser = { ...mockUser, googleId: null };
      usersRepository.findOne
        .mockResolvedValueOnce(null) // No user with googleId
        .mockResolvedValueOnce(existingLocalUser); // User with email exists
      usersRepository.save.mockResolvedValue({
        ...existingLocalUser,
        googleId: googleProfile.googleId,
        authProvider: AuthProvider.GOOGLE,
      });

      const result = await service.validateGoogleUser(googleProfile);

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: googleProfile.googleId,
          authProvider: AuthProvider.GOOGLE,
        }),
      );
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const user = mockUser as User;
      service.generateAccessToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with correct options', () => {
      const user = mockUser as User;
      service.generateRefreshToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return user for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: UserRole.USER });
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for deactivated user', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: UserRole.USER });
      usersRepository.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      jwtService.verify.mockReturnValue({ sub: 'non-existent', email: 'test@example.com', role: UserRole.USER });
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});
