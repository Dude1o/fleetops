export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  redisUrl: process.env.REDIS_URL,
  // ponytail: comma-separated allowlist, empty = same-origin only
  corsOrigin: process.env.CORS_ORIGIN ?? '',
});
