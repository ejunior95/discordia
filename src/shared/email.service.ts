import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendWelcomeEmail(to: string, name: string) {
    try {
      const formattedName = name.split(' ')[0];
      await this.resend.emails.send({
        from: 'Equipe DiscordIA <no-reply@discordia.app.br>',
        to,
        subject: 'Bem-vindo ao DiscordIA!',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá, ${formattedName} 👋</h2>
            <p>Seja muito bem-vindo ao <strong>DiscordIA</strong>!</p>
            <p>Sua conta foi confirmada e você já pode aproveitar tudo que preparamos por aqui.</p>
            <br/>
            <p>Abraços,<br/>Equipe DiscordIA</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Erro ao enviar email de boas-vindas', error as Error);
    }
  }

  async sendVerificationEmail(to: string, name: string, code: string) {
    const formattedName = name.split(' ')[0];

    try {
      await this.resend.emails.send({
        from: 'Equipe DiscordIA <no-reply@discordia.app.br>',
        to,
        subject: 'Seu código de verificação no DiscordIA',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; max-width: 480px; margin: 0 auto;">
            <h2 style="margin-bottom: 8px;">Olá, ${formattedName} 👋</h2>
            <p style="margin: 0 0 16px;">
              Use o código abaixo para confirmar seu cadastro no
              <strong>DiscordIA</strong>:
            </p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 12px; text-align: center; padding: 16px 0; background: #f4f4f5; border-radius: 8px; color: #18181b;">
              ${code}
            </div>
            <p style="margin: 16px 0 0; color: #52525b; font-size: 14px;">
              O código expira em <strong>10 minutos</strong>. Se você não criou esta conta, pode ignorar este email.
            </p>
            <br/>
            <p>Abraços,<br/>Equipe DiscordIA</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Erro ao enviar email de verificação', error as Error);
      throw error;
    }
  }
}
