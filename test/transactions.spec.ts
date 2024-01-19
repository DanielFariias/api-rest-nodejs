import { afterAll, beforeAll, describe, expect, it, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'

import request from 'supertest'

import { app } from '../src/app'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback -all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    const response = await request(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit',
    })

    expect(response.status).toBe(201)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.headers['set-cookie']

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)

    expect(listTransactionsResponse.status).toBe(200)
    expect(listTransactionsResponse.body.results).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ])
  })

  it('should be able to get specific transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.headers['set-cookie']

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsResponse.body.results[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)

    expect(getTransactionResponse.status).toBe(200)
    console.log(getTransactionResponse.body)
    expect(getTransactionResponse.body.results).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    )
  })

  it('should be able to get the summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Credit transaction',
        amount: 10000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.headers['set-cookie']

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'Debit transaction',
        amount: 5000,
        type: 'debit',
      })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)

    expect(summaryResponse.status).toBe(200)
    expect(summaryResponse.body.results).toEqual(
      expect.objectContaining({
        amount: 5000,
      }),
    )
  })
})
