import { RedisLockService } from '../src/common/redis/redis-lock.service';
import { RedisService } from '../src/common/redis/redis.service';
async function main() {
  const redisService = new RedisService();
  const redisLockService = new RedisLockService(redisService);
  await redisService.onModuleInit();
  const lockKey = 'test:redis-lock';
  try {
    const firstToken = await redisLockService.acquire(lockKey, 5000);
    console.log('First acquire:', firstToken ? 'SUCCESS' : 'FAILED');

    if (!firstToken) {
      throw new Error('First lock acquisition should succeed');
    }

    const secondToken = await redisLockService.acquire(lockKey, 5000);

    console.log('Second acquire:', secondToken ? 'SUCCESS' : 'FAILED');

    if (secondToken !== null) {
      throw new Error('Second lock acquisition should fail');
    }

    const released = await redisLockService.release(lockKey, firstToken);

    console.log('First release:', released ? 'SUCCESS' : 'FAILED');

    if (!released) {
      throw new Error('First lock release should succeed');
    }

    const thirdToken = await redisLockService.acquire(lockKey, 5000);

    console.log('Third acquire:', thirdToken ? 'SUCCESS' : 'FAILED');

    if (!thirdToken) {
      throw new Error('Third lock acquisition should succeed after release');
    }

    await redisLockService.release(lockKey, thirdToken);

    console.log('Redis lock test passed.');
  } finally {
    await redisService.onModuleDestroy();
  }
}
main().catch((error) => {
  console.error('Redis lock test failed:', error);
  process.exit(1);
});
