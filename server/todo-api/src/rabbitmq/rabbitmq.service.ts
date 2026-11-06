import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqplib, { Channel, ChannelModel } from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly queueName: string;
  private readonly url: string;
  private isConnecting = false;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
    this.queueName = this.configService.get<string>('EMAIL_QUEUE') || 'email_queue';
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.connection || this.isConnecting) return;
    this.isConnecting = true;
    try {
      this.connection = await amqplib.connect(this.url);
      this.connection.on('error', (err) => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`);
        this.connection = null;
        this.channel = null;
      });
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed. Reconnecting in 3s...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), 3000);
      });

      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      this.logger.log(`Connected to RabbitMQ at ${this.url}, asserted queue "${this.queueName}" (durable: true)`);
    } catch (error: any) {
      this.logger.warn(`Could not connect to RabbitMQ: ${error.message}. Will retry on next publish or in 5s.`);
      this.connection = null;
      this.channel = null;
      setTimeout(() => this.connect(), 5000);
    } finally {
      this.isConnecting = false;
    }
  }

  private async getChannel(): Promise<Channel | null> {
    if (!this.channel) {
      await this.connect();
    }
    return this.channel;
  }

  async publishUserRegistered(user: { id: number; email: string; name?: string }): Promise<boolean> {
    try {
      const channel = await this.getChannel();
      if (!channel) {
        this.logger.error('RabbitMQ channel not available to publish user.registered');
        return false;
      }

      await channel.assertQueue(this.queueName, { durable: true });

      const payload = {
        pattern: 'user.registered',
        data: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          registeredAt: new Date().toISOString(),
        },
        messageId: `user-${user.id}-${Date.now()}`,
      };

      // Persistent message: deliveryMode = 2
      const sent = channel.sendToQueue(
        this.queueName,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: payload.messageId,
        },
      );

      this.logger.log(`Published persistent user.registered to ${this.queueName} for user: ${user.email}`);
      return sent;
    } catch (error: any) {
      this.logger.error(`Failed to publish user.registered: ${error.message}`);
      return false;
    }
  }

  async publishTopic(exchange: string, routingKey: string, data: any): Promise<boolean> {
    try {
      const channel = await this.getChannel();
      if (!channel) return false;

      await channel.assertExchange(exchange, 'topic', { durable: true });
      return channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(data)),
        { persistent: true, contentType: 'application/json' },
      );
    } catch (error: any) {
      this.logger.error(`Failed to publish topic event: ${error.message}`);
      return false;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {}
  }
}

