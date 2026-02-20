import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { SemanticEngine } from '../services/semantic-engine.js';
import { CacheService } from '../services/cache.js';

const semanticEngine = new SemanticEngine();
const cacheService = new CacheService();

const translateSchema = z.object({
  key: z.string().min(1),
  lang: z.string().min(2).max(10),
  context: z.string().optional(),
});

type TranslateQuery = z.infer<typeof translateSchema>;

// GET /translate?key=intent:greeting+context:app_entry&lang=tr
export async function translateRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TranslateQuery }>(
    '/translate',
    {
      schema: {
        querystring: translateSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              lang: { type: 'string' },
              context: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: TranslateQuery }>, reply: FastifyReply) => {
      const { key, lang, context } = request.query;

      try {
        // Semantic key parsing
        const parsed = semanticEngine.parseKey(key);
        
        // Check cache first
        const cached = await cacheService.get(key, lang);
        if (cached) {
          return reply.send({
            key,
            value: cached,
            lang,
            context: parsed.context,
            cached: true,
          });
        }

        // Find translation in database
        const translationKey = await prisma.translationKey.findFirst({
          where: {
            OR: [
              { key: key },
              { intent: parsed.intent, context: parsed.context },
            ],
          },
          include: {
            translations: {
              where: {
                language: { code: lang },
                status: 'APPROVED',
              },
            },
          },
        });

        if (!translationKey || translationKey.translations.length === 0) {
          return reply.code(404).send({
            error: 'Translation not found',
            key,
            lang,
          });
        }

        const translation = translationKey.translations[0];

        // Cache the result
        await cacheService.set(key, lang, translation.value);

        return reply.send({
          key,
          value: translation.value,
          lang,
          context: parsed.context,
          cached: false,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          error: 'Internal server error',
        });
      }
    }
  );

  // POST /translate/batch - Batch translation lookup
  fastify.post(
    '/translate/batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { keys: string[]; lang: string };
      const { keys, lang } = body;

      if (!keys || !lang || !Array.isArray(keys)) {
        return reply.code(400).send({ error: 'Invalid request body' });
      }

      const results = await Promise.all(
        keys.map(async (key) => {
          const cached = await cacheService.get(key, lang);
          if (cached) return { key, value: cached, cached: true };

          const parsed = semanticEngine.parseKey(key);
          const translationKey = await prisma.translationKey.findFirst({
            where: {
              OR: [{ key }, { intent: parsed.intent, context: parsed.context }],
            },
            include: {
              translations: {
                where: { language: { code: lang }, status: 'APPROVED' },
              },
            },
          });

          if (!translationKey || translationKey.translations.length === 0) {
            return { key, value: null, found: false };
          }

          const value = translationKey.translations[0].value;
          await cacheService.set(key, lang, value);
          return { key, value, found: true, cached: false };
        })
      );

      return reply.send({ translations: results });
    }
  );
}
