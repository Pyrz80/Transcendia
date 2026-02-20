import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';

export async function languagesRoutes(fastify: FastifyInstance) {
  // GET /languages - List all supported languages
  fastify.get(
    '/languages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const languages = await prisma.language.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            nativeName: true,
          },
        });

        return reply.send({
          languages,
          count: languages.length,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /languages/:code - Get specific language
  fastify.get(
    '/languages/:code',
    async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
      const { code } = request.params;

      try {
        const language = await prisma.language.findUnique({
          where: { code },
          include: {
            _count: {
              select: {
                translations: true,
                contributions: true,
              },
            },
          },
        });

        if (!language) {
          return reply.code(404).send({ error: 'Language not found' });
        }

        return reply.send(language);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /languages - Add new language (admin only in production)
  fastify.post(
    '/languages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { code: string; name: string; nativeName: string };

      const { code, name, nativeName } = body;

      if (!code || !name || !nativeName) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      try {
        const language = await prisma.language.create({
          data: {
            code: code.toLowerCase(),
            name,
            nativeName,
          },
        });

        return reply.code(201).send(language);
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.code(409).send({ error: 'Language code already exists' });
        }
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}
