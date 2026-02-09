import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as TelegramBot from 'node-telegram-bot-api';

import { User } from '../users/entities/user.entity';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });

    this.bot.onText(/\/start (.+)/, async (msg, match) => {
      await this.handleStart(msg, match);
    });

    this.bot.onText(/^\/start$/, async (msg) => {
      await this.bot!.sendMessage(
        msg.chat.id,
        'Usa el enlace de tu perfil en Circle Hours para conectar tu cuenta.',
      );
    });

    this.logger.log('Telegram bot started (polling mode)');
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stopPolling();
    }
  }

  private async handleStart(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const userId = match?.[1];

    if (!userId) {
      await this.bot!.sendMessage(
        chatId,
        'Enlace inválido. Usa el enlace de tu perfil en Circle Hours.',
      );
      return;
    }

    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });

      if (!user) {
        await this.bot!.sendMessage(chatId, 'Usuario no encontrado.');
        return;
      }

      user.telegramChatId = chatId.toString();
      await this.usersRepository.save(user);

      await this.bot!.sendMessage(
        chatId,
        `¡Conectado! Hola ${user.name}, ahora recibirás recordatorios de horas por Telegram.`,
      );

      this.logger.log(`Telegram linked for user ${user.email} (chat_id: ${chatId})`);
    } catch (error) {
      this.logger.error(`Failed to handle /start for chat ${chatId}`, error);
      await this.bot!.sendMessage(chatId, 'Error al conectar. Inténtalo de nuevo más tarde.');
    }
  }

  async sendReminder(chatId: string, userName: string, loginUrl: string): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot is not configured');
    }

    const message =
      `Hola ${userName},\n\n` +
      `Te falta registrar tus horas de la semana pasada en Circle Hours.\n\n` +
      `Haz clic aquí para iniciar sesión y registrarlas:\n${loginUrl}\n\n` +
      `Este enlace es de un solo uso y expira en 7 días.`;

    await this.bot.sendMessage(chatId, message);
  }

  getBotUsername(): string | null {
    const botName = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    return botName || null;
  }
}
