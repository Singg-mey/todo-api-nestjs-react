import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { TokenType } from './types/token.types.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateRefreshToken: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateRefreshToken: vi.fn(),
    };

    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'jwt.accessSecret' || key === 'JWT_ACCESS_SECRET') {
          return 'test-access-secret';
        }
        if (key === 'jwt.refreshSecret' || key === 'JWT_REFRESH_SECRET') {
          return 'test-refresh-secret';
        }
        if (key === 'jwt.accessExpiresIn' || key === 'JWT_ACCESS_EXPIRES_IN') {
          return '15m';
        }
        if (key === 'jwt.refreshExpiresIn' || key === 'JWT_REFRESH_EXPIRES_IN') {
          return '7d';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('should throw ConflictException (409) if email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(
        authService.signup({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password with argon2 and create user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (userData) => ({
        id: 1,
        ...userData,
      }));

      const res = await authService.signup({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(res).toEqual({
        id: 1,
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
      });
      expect(usersService.create).toHaveBeenCalled();
      const createdArg = usersService.create.mock.calls[0][0];
      expect(createdArg.password).not.toBe('password123');
      const isValid = await argon2.verify(createdArg.password, 'password123');
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException on invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const mockRes: any = { cookie: vi.fn() };
      await expect(
        authService.login({ email: 'wrong@example.com', password: 'password' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should sign access and refresh tokens with separated secrets and types', async () => {
      const hashedPassword = await argon2.hash('correctPassword');
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        name: 'Test',
        role: 'user',
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');

      const mockRes: any = { cookie: vi.fn() };
      const result = await authService.login(
        { email: 'user@example.com', password: 'correctPassword' },
        mockRes,
      );

      expect(result.accessToken).toBe('access-token-123');
      expect(result.user.email).toBe('user@example.com');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token-456',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalled();

      // Verify signAsync was called with separated secrets and payload types
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: TokenType.ACCESS, sub: 1 }),
        expect.objectContaining({ secret: 'test-access-secret', expiresIn: '15m' }),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ type: TokenType.REFRESH, sub: 1 }),
        expect.objectContaining({ secret: 'test-refresh-secret', expiresIn: '7d' }),
      );
    });

    it('should throw an Error if JWT_ACCESS_SECRET or JWT_REFRESH_SECRET config is missing', async () => {
      configService.get.mockReturnValue(undefined);

      const mockRes: any = { cookie: vi.fn() };
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        password: await argon2.hash('correctPassword'),
      });

      await expect(
        authService.login(
          { email: 'user@example.com', password: 'correctPassword' },
          mockRes,
        ),
      ).rejects.toThrow(/configuration is required/i);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refreshToken is not provided', async () => {
      const mockRes: any = { cookie: vi.fn() };
      await expect(authService.refresh(undefined, mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should verify refresh token using separate refresh secret', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const mockRes: any = { cookie: vi.fn() };

      await expect(authService.refresh('invalid-token', mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException if token type is not REFRESH (type separation check)', async () => {
      // Mock an access token presented to refresh endpoint
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
        role: 'user',
        type: TokenType.ACCESS, // Wrong type!
      });

      const mockRes: any = { cookie: vi.fn() };
      await expect(authService.refresh('access-token-used-as-refresh', mockRes)).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('should invalidate token and clear cookie if refresh token reuse is detected', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
        role: 'user',
        type: TokenType.REFRESH,
      });

      const storedHash = await argon2.hash('actual-stored-token');
      usersService.findById.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        hashedRefreshToken: storedHash,
      });

      const mockRes: any = { clearCookie: vi.fn(), cookie: vi.fn() };
      await expect(
        authService.refresh('replayed-old-token', mockRes),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(1, null);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/' });
    });

    it('should rotate tokens and return new access token when refresh token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
        role: 'user',
        type: TokenType.REFRESH,
      });

      const validToken = 'valid-refresh-token';
      const storedHash = await argon2.hash(validToken);
      usersService.findById.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        role: 'user',
        name: 'User One',
        hashedRefreshToken: storedHash,
      });

      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token-789')
        .mockResolvedValueOnce('new-refresh-token-012');

      const mockRes: any = { cookie: vi.fn() };
      const res = await authService.refresh(validToken, mockRes);

      expect(res.accessToken).toBe('new-access-token-789');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token-012',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
    });
  });
});
