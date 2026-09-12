import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.client.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, { EX: ttlSeconds });
      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
