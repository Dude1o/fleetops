import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from './redis.service';
@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    if (ttlMs <= 0) {
      throw new Error('Redis lock TTL must be greater than 0');
    }
    const token = randomUUID();
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    const acquired = await this.redisService.setIfNotExists(
      key,
      token,
      ttlSeconds,
    );

    return acquired ? token : null;
  }
  async release(key: string, token: string): Promise<boolean> {
    const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
    const result = await this.redisService.eval(script, {
      keys: [key],
      arguments: [token],
    });

    return result === 1;
  }
}
