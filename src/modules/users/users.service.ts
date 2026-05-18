import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User } from './entities/user.entity';
import { MongoServerError, ObjectId } from 'mongodb';
import { hashPassword } from 'src/utils/hash';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { EmailService } from 'src/shared/email.service';
import { S3Service } from 'src/shared/s3.service';
import { compare, hash as bcryptHash } from 'bcryptjs';
import { randomInt } from 'crypto';
import { BillingService } from '../billing/billing.service';
import { CreditsService } from '../credits/credits.service';
import { CURRENT_TERMS_VERSION } from 'src/shared/legal.constants';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000; // 60s
const VERIFICATION_MAX_ATTEMPTS = 5;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly billingService: BillingService,
    private readonly creditsService: CreditsService,
  ) {}

  private generateVerificationCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private async setVerificationCode(user: User): Promise<string> {
    const code = this.generateVerificationCode();
    const codeHash = await bcryptHash(code, 10);
    await this.userRepository.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationCodeHash: codeHash,
          verificationCodeExpiresAt: new Date(
            Date.now() + VERIFICATION_CODE_TTL_MS,
          ),
          verificationAttempts: 0,
          verificationLastSentAt: new Date(),
        },
      },
    );
    return code;
  }

  async create(data: CreateUserDto, file?: Express.Multer.File): Promise<User> {
    const { acceptTerms, termsVersion, ...userData } = data;
    const user = this.userRepository.create({
      ...userData,
      password: await hashPassword(data.password),
      isVerified: false,
      verificationAttempts: 0,
      terms_accepted_at: acceptTerms ? new Date() : undefined,
      terms_accepted_version: acceptTerms
        ? (termsVersion ?? CURRENT_TERMS_VERSION)
        : undefined,
    });

    let result: User;
    try {
      result = await this.userRepository.save(user);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new BadRequestException('Este email já está em uso.');
      }
      throw err;
    }

    if (file) {
      const url = await this.s3Service.uploadFile(
        file,
        `avatars/${result._id}`,
      );
      result.avatar = url;
      await this.userRepository.update(result._id, { avatar: url });
    }

    try {
      await this.billingService.ensureFreeSubscription(result._id.toString());
      await this.creditsService.ensureWallet(result._id.toString());
    } catch (err) {
      // não bloqueia o cadastro se billing falhar
      this.logger.warn(
        `Falha ao criar subscription/wallet free: ${(err as Error).message}`,
      );
    }

    try {
      const code = await this.setVerificationCode(result);
      await this.emailService.sendVerificationEmail(
        result.email,
        result.name,
        code,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao enviar email de verificação para ${result.email}`,
        err as Error,
      );
      // Não bloqueia o cadastro: usuário pode pedir reenvio.
    }

    return result;
  }

  /**
   * Reenvia o código de verificação. Aplica cooldown de 60s.
   * Não revela se o email existe — chame sempre com a mesma resposta no controller.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) return; // resposta genérica
    if (user.isVerified) return;

    if (
      user.verificationLastSentAt &&
      Date.now() - new Date(user.verificationLastSentAt).getTime() <
        VERIFICATION_RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Aguarde alguns segundos antes de pedir um novo código.',
      );
    }

    const code = await this.setVerificationCode(user);
    await this.emailService.sendVerificationEmail(user.email, user.name, code);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { deleted_at: null },
    });
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Usuário com este email não foi encontrado');
    }
    return user;
  }

  async update(id: string, data: UpdateUserDto, file?: Express.Multer.File) {
    const user = await this.userRepository.findOneBy({ _id: new ObjectId(id) });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: data.email },
        withDeleted: true,
      });

      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Este email já está em uso.');
      }
      user.email = data.email;
    }

    if (data.name && data.name !== user.name) {
      user.name = data.name;
    }

    if (data.currentPassword && data.password) {
      const isMatch = await compare(data.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Senha atual incorreta.');
      }
      user.password = await hashPassword(data.password);
    }

    if (data.bio !== undefined) {
      user.bio = data.bio;
    }

    if (data.socials !== undefined) {
      user.socials = {
        ...(user.socials ?? {}),
        ...data.socials,
      };
    }

    if (file) {
      const url = await this.s3Service.uploadFile(file, `avatars/${id}`);
      user.avatar = url;
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    await this.userRepository.update(id, {
      deleted_at: new Date(),
    });
  }

  /**
   * Valida o código OTP enviado por email. Em caso de sucesso, marca o usuário
   * como verificado, limpa os campos OTP e dispara email de boas-vindas.
   * Lança exceção em caso de código inválido, expirado ou excesso de tentativas.
   */
  async verifyEmailCode(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.isVerified) return user;

    if (
      !user.verificationCodeHash ||
      !user.verificationCodeExpiresAt ||
      new Date(user.verificationCodeExpiresAt).getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Código de verificação expirado. Solicite um novo.',
      );
    }

    if ((user.verificationAttempts ?? 0) >= VERIFICATION_MAX_ATTEMPTS) {
      throw new ForbiddenException(
        'Número máximo de tentativas excedido. Solicite um novo código.',
      );
    }

    const matches = await compare(code, user.verificationCodeHash);
    if (!matches) {
      await this.userRepository.updateOne(
        { _id: user._id },
        { $inc: { verificationAttempts: 1 } },
      );
      throw new BadRequestException('Código de verificação inválido.');
    }

    await this.userRepository.updateOne(
      { _id: user._id },
      {
        $set: {
          isVerified: true,
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
          verificationAttempts: 0,
          verificationLastSentAt: null,
        },
      },
    );

    // Email de boas-vindas é fire-and-forget: não bloqueia/falha a verificação.
    void this.emailService.sendWelcomeEmail(user.email, user.name);

    return {
      ...user,
      isVerified: true,
      verificationCodeHash: undefined,
      verificationCodeExpiresAt: undefined,
      verificationAttempts: 0,
      verificationLastSentAt: undefined,
    };
  }
}
