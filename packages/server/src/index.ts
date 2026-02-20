import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { translateRoutes } from './routes/translate.js';
import { languagesRoutes } from './routes/languages.js';
import { contributeRoutes } from './routes/contribute.js';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({
  logger: true,
});

// Database client
export const prisma = new PrismaClient();

// Plugins
await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(cors, {
  origin: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Routes
await fastify.register(translateRoutes, { prefix: '/api/v1' });
await fastify.register(languagesRoutes, { prefix: '/api/v1' });
await fastify.register(contributeRoutes, { prefix: '/api/v1' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Transcendia API running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
