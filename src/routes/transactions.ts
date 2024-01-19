import crypto, { randomUUID } from 'node:crypto'

import { FastifyInstance } from 'fastify'

import { z } from 'zod'

import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

const createTransactionBodySchema = z.object({
  title: z.string(),
  amount: z.number(),
  type: z.enum(['credit', 'debit']),
})

const getTransactionParamsSchema = z.object({
  id: z.string().uuid(),
})

export async function transactionsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const transactions = await knex('transactions').select('*').where({
      session_id: sessionId,
    })

    return {
      results: transactions,
    }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { id } = getTransactionParamsSchema.parse(request.params)
    const { sessionId } = request.cookies

    const transaction = await knex('transactions')
      .select('*')
      .where({ id, session_id: sessionId })
      .first()

    return {
      results: transaction,
    }
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .sum('amount', {
          as: 'amount',
        })
        .where({ session_id: sessionId })
        .first()

      return {
        results: summary,
      }
    },
  )

  app.post('/', async (request, reply) => {
    const { amount, title, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
