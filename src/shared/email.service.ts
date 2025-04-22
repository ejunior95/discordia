import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendWelcomeEmail(to: string, name: string) {
    try {
      const formattedName = name.split(' ')[0]
      await this.resend.emails.send({
        from: 'Equipe DiscordIA <no-reply@discordia.app.br>',
        to,
        subject: 'Bem-vindo ao DiscordIA!',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá, ${formattedName} 👋</h2>
            <p>Seja muito bem-vindo ao <strong>DiscordIA</strong>!</p>
            <p>Estamos animados em ter você por aqui.</p>
            <br/>
            <p>Abraços,<br/>Equipe DiscordIA</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const formattedName = name.split(' ')[0];
    const verifyUrl = `https://discordia.app.br/auth/verify?token=${token}`;
  
    try {
      await this.resend.emails.send({
        from: 'Equipe DiscordIA <no-reply@discordia.app.br>',
        to,
        subject: 'Confirme seu email no DiscordIA',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá, ${formattedName} 👋</h2>
            <p>Confirme seu cadastro clicando no link abaixo:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <br/><br/>
            <p>Abraços,<br/>Equipe DiscordIA</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Erro ao enviar email de verificação:', error);
    }
  }  
  
}
