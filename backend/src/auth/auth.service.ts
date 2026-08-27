import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, IsNull, MoreThan, QueryFailedError } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { UserStatus } from '../users/user-status.enum';
import { AuthenticatedUser } from './authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { SessionEntity } from './session.entity';

interface AuthenticationResult {
  user: AuthenticatedUser;
  sessionToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthenticationResult> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const sessionToken = this.createSessionToken();

    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(UserEntity);
        const existingUser = await users.findOne({ where: { email: dto.email } });

        if (existingUser) {
          throw new ConflictException('Já existe uma conta com este e-mail.');
        }

        const createdUser = await users.save(
          users.create({
            name: dto.name,
            email: dto.email,
            passwordHash,
            status: UserStatus.ACTIVE,
          }),
        );

        await manager.getRepository(SessionEntity).save(
          manager.getRepository(SessionEntity).create({
            userId: createdUser.id,
            tokenHash: this.hashSessionToken(sessionToken),
            expiresAt: this.sessionExpiration(),
            revokedAt: null,
          }),
        );

        return createdUser;
      });

      return { user: this.toAuthenticatedUser(user), sessionToken };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthenticationResult> {
    const user = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();
    const credentialsAreValid =
      user && (await this.passwordService.verify(dto.password, user.passwordHash));

    if (!credentialsAreValid || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const sessionToken = this.createSessionToken();
    const sessions = this.dataSource.getRepository(SessionEntity);
    await sessions.save(
      sessions.create({
        userId: user.id,
        tokenHash: this.hashSessionToken(sessionToken),
        expiresAt: this.sessionExpiration(),
        revokedAt: null,
      }),
    );

    return { user: this.toAuthenticatedUser(user), sessionToken };
  }

  async authenticate(sessionToken: string): Promise<AuthenticatedUser> {
    const session = await this.dataSource.getRepository(SessionEntity).findOne({
      where: {
        tokenHash: this.hashSessionToken(sessionToken),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!session || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    return this.toAuthenticatedUser(session.user);
  }

  async logout(sessionToken?: string): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.dataSource.getRepository(SessionEntity).update(
      {
        tokenHash: this.hashSessionToken(sessionToken),
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }

  async disableAccount(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(UserEntity)
        .update({ id: userId }, { status: UserStatus.DISABLED });
      await manager.getRepository(SessionEntity).update(
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });
  }

  private createSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sessionExpiration(): Date {
    const ttlDays = this.configService.get<number>('SESSION_TTL_DAYS', 7);
    return new Date(Date.now() + ttlDays * 86_400_000);
  }

  private toAuthenticatedUser(user: UserEntity): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
