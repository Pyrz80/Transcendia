import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { SemanticEngine } from '../services/semantic-engine.js';

const semanticEngine = new SemanticEngine();

const contributeSchema = z.object({
  key: z.string().min(1),
  lang: z.string().min(2).max(10),
  value: z.string().min(1),
  comment: z.string().optional(),
  contributorId: z.string().optional(),
});

type ContributeBody = z.infer<typeof contributeSchema>;

export async function contributeRoutes(fastify: FastifyInstance) {
  // POST /contribute - Submit new translation suggestion
  fastify.post(
    '/contribute',
    {
      schema: {
        body: contributeSchema,
      },
    },
    async (request: FastifyRequest<{ Body: ContributeBody }>, reply: FastifyReply) => {
      const { key, lang, value, comment, contributorId } = request.body;

      try {
        // Parse semantic key
        const parsed = semanticEngine.parseKey(key);

        // Find or create the translation key
        let translationKey = await prisma.translationKey.findFirst({
          where: {
            OR: [
              { key },
              { intent: parsed.intent, context: parsed.context },
            ],
          },
        });

        if (!translationKey) {
          translationKey = await prisma.translationKey.create({
            data: {
              key,
              intent: parsed.intent,
              context: parsed.context || 'default',
            },
          });
        }

        // Find the language
        const language = await prisma.language.findUnique({
          where: { code: lang },
        });

        if (!language) {
          return reply.code(404).send({ error: 'Language not found' });
        }

        // Create contribution
        const contribution = await prisma.contribution.create({
          data: {
            keyId: translationKey.id,
            languageId: language.id,
            suggestedValue: value,
            comment,
            contributorId,
            status: 'OPEN',
          },
        });

        return reply.code(201).send({
          message: 'Contribution submitted successfully',
          contribution: {
            id: contribution.id,
            key,
            lang,
            value,
            status: contribution.status,
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /contribute - List open contributions
  fastify.get(
    '/contribute',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { status, lang, limit = '20', offset = '0' } = request.query as any;

      try {
        const where: any = {};
        if (status) where.status = status.toUpperCase();
        if (lang) where.language = { code: lang };

        const contributions = await prisma.contribution.findMany({
          where,
          include: {
            key: true,
            language: true,
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.contribution.count({ where });

        return reply.send({
          contributions,
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // PUT /contribute/:id/approve - Approve a contribution (admin)
  fastify.put(
    '/contribute/:id/approve',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const contribution = await prisma.contribution.findUnique({
          where: { id },
          include: { key: true, language: true },
        });

        if (!contribution) {
          return reply.code(404).send({ error: 'Contribution not found' });
        }

        // Update contribution status
        await prisma.contribution.update({
          where: { id },
          data: { status: 'APPROVED' },
        });

        // Upsert the translation
        const translation = await prisma.translation.upsert({
          where: {
            keyId_languageId: {
              keyId: contribution.keyId,
              languageId: contribution.languageId,
            },
          },
          create: {
            keyId: contribution.keyId,
            languageId: contribution.languageId,
            value: contribution.suggestedValue,
            status: 'APPROVED',
          },
          update: {
            value: contribution.suggestedValue,
            status: 'APPROVED',
          },
        });

        return reply.send({
          message: 'Contribution approved',
          translation: {
            id: translation.id,
            key: contribution.key.key,
            value: translation.value,
            lang: contribution.language.code,
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  // PUT /contribute/:id/reject - Reject a contribution (admin)
  fastify.put(
    '/contribute/:id/reject',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { reason } = request.body as { reason?: string };

      try {
        const contribution = await prisma.contribution.update({
          where: { id },
          data: { status: 'REJECTED' },
        });

        return reply.send({
          message: 'Contribution rejected',
          contribution: {
            id: contribution.id,
            status: contribution.status,
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}
