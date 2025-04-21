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
      const formattedName = name.split(' ')
      await this.resend.emails.send({
        from: 'Equipe DiscordIA <no-reply@discordia.app.br>',
        to,
        subject: 'Bem-vindo ao DiscordIA!',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá, ${formattedName[0]} 👋</h2>
            <p>Seja muito bem-vindo ao <strong>DiscordIA</strong>!</p>
            <p>Estamos animados em ter você por aqui.</p>
            <br/>
            <p>Abraços,<br/>Equipe DiscordIA</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
    }
  }
}
