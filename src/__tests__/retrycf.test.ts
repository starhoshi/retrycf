import * as admin from 'firebase-admin'
import * as Retrycf from '../retrycf'
import * as Rescue from 'rescue-fire'
import 'jest'

jest.setTimeout(20000)
beforeAll(() => {
  const serviceAccount = require('../../sandbox-329fc-firebase-adminsdk.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  Retrycf.initialize({
    projectId: 'sandbox-329fc',
    keyFilename: './sandbox-329fc-firebase-adminsdk.json'
  }, { maxRetryCount: 2 })
})

let user: FirebaseFirestore.DocumentReference
const data = { name: 'test' }
const error = Error('An error occured')
const defaultRetry = { count: 1, errors: [{ createdAt: new Date(), error: error.toString(), stack: 'line:1' }] }

beforeEach(async () => {
  user = await admin.firestore().collection('retrycf-user').add(data)
})

describe('setRetry', () => {
  describe('data not exist retry', () => {
    test('only 1 error', async () => {
      const event = Rescue.event(user, data)
      const retry = await Retrycf.setRetry(event.data.ref, event.data.data(), error)

      expect(retry.count).toBe(1)
      expect(retry.errors.length).toBe(1)
      expect(retry.errors[0].createdAt).toBeDefined()
      expect(retry.errors[0].error).toBeDefined()
      expect(retry.errors[0].stack).toBeDefined()

      const updatedUser = await admin.firestore().doc(user.path).get().then(s => s.data()!)
      expect(updatedUser.retry.count).toBe(1)
      expect(updatedUser.retry.errors.length).toBe(1)
      expect(updatedUser.retry.errors[0].createdAt).toBeDefined()
      expect(updatedUser.retry.errors[0].error).toBeDefined()
      expect(updatedUser.retry.errors[0].stack).toBeDefined()
    })
  })

  describe('data already exist retry', () => {
    test('exist multiple error', async () => {
      await user.update({ retry: defaultRetry })
      const event = Rescue.event(user, { name: 'test', retry: defaultRetry })
      const retry = await Retrycf.setRetry(event.data.ref, event.data.data(), error)

      expect(retry.count).toBe(2)
      expect(retry.errors.length).toBe(2)
      expect(retry.errors[0].createdAt).toBeDefined()
      expect(retry.errors[0].error).toBe(defaultRetry.errors[0].error)
      expect(retry.errors[0].stack).toBeDefined()
      expect(retry.errors[1].createdAt).toBeDefined()
      expect(retry.errors[1].error).toBeDefined()
      expect(retry.errors[1].stack).toBeDefined()

      const updatedUser = await admin.firestore().doc(user.path).get().then(s => s.data()!)
      expect(updatedUser.retry.count).toBe(2)
      expect(updatedUser.retry.errors.length).toBe(2)
      expect(updatedUser.retry.errors[0].createdAt).toBeDefined()
      expect(updatedUser.retry.errors[0].error).toBe(defaultRetry.errors[0].error)
      expect(updatedUser.retry.errors[0].stack).toBeDefined()
      expect(updatedUser.retry.errors[1].createdAt).toBeDefined()
      expect(updatedUser.retry.errors[1].error).toBeDefined()
      expect(updatedUser.retry.errors[1].stack).toBeDefined()
    })
  })

  describe('data.retry exist, but not exist count', () => {
    test('only 1 error', async () => {
      await user.update({ retry: {} })
      const event = Rescue.event(user, { name: 'test', retry: {} })
      const retry = await Retrycf.setRetry(event.data.ref, event.data.data(), error)

      expect(retry.count).toBe(1)
      expect(retry.errors.length).toBe(1)
      expect(retry.errors[0].createdAt).toBeDefined()
      expect(retry.errors[0].error).toBeDefined()
      expect(retry.errors[0].stack).toBeDefined()

      const updatedUser = await admin.firestore().doc(user.path).get().then(s => s.data()!)
      expect(updatedUser.retry.count).toBe(1)
      expect(updatedUser.retry.errors.length).toBe(1)
      expect(updatedUser.retry.errors[0].createdAt).toBeDefined()
      expect(updatedUser.retry.errors[0].error).toBeDefined()
      expect(updatedUser.retry.errors[0].stack).toBeDefined()
    })
  })
})

describe('retryStatus', () => {
  describe('data.retry.count is undefined', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = undefined
      const previousData = undefined
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data.retry.count is 1, previous is undefined', () => {
    test('Status.ShouldRetry', async () => {
      const currentData = { retry: { count: 1 } }
      const previousData = undefined
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldRetry)
    })
  })

  describe('data.retry.count is 1, previous is 1', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = { retry: { count: 1 } }
      const previousData = { retry: { count: 1 } }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data.retry.count is 3, previous is 2', () => {
    test('Status.RetryFailed', async () => {
      const currentData = { retry: { count: 3 } }
      const previousData = { retry: { count: 2 } }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.RetryFailed)
    })
  })

  describe('data.retry.count is 2, previous is 3', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = { retry: { count: 2 } }
      const previousData = { retry: { count: 3 } }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data exist, but retry undefined', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = {}
      const previousData = {}
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data.retry undefined', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = { retry: undefined }
      const previousData = { retry: undefined }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data.retry.count undefined', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = { retry: { count: undefined } }
      const previousData = { retry: { counst: undefined } }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('data.retry exist, but data.retry.count is undefined', () => {
    test('Status.ShouldNotRetry', async () => {
      const currentData = { retry: {} }
      const previousData = { retry: {} }
      const retryStatus = Retrycf.retryStatus(currentData, previousData)

      expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
    })
  })

  describe('change maxRetryCount to 3', () => {
    describe('data.retry.count is 3, previous is 2', () => {
      test('Status.ShouldRetry', async () => {
        const currentData = { retry: { count: 3 } }
        const previousData = { retry: { count: 2 } }
        const retryStatus = Retrycf.retryStatus(currentData, previousData, 3)

        expect(retryStatus).toBe(Retrycf.Status.ShouldRetry)
      })
    })

    describe('data.retry.count is 3, previous is 1', () => {
      test('Status.ShouldNotRetry', async () => {
        const currentData = { retry: { count: 3 } }
        const previousData = { retry: { count: 1 } }
        const retryStatus = Retrycf.retryStatus(currentData, previousData, 3)

        expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry)
      })
    })
  })
})

describe('clear', () => {
  test('update to {}', async () => {
    // prepare
    const event = Rescue.event(user, data)
    await Retrycf.setRetry(event.data.ref, event.data.data(), error)
    let updatedUser = await admin.firestore().doc(user.path).get().then(s => s.data()!)
    expect(updatedUser.retry.count).toBe(1)

    // clear
    const retry = await Retrycf.clear(user)

    // expect
    expect(retry).toEqual({})
    updatedUser = await admin.firestore().doc(user.path).get().then(s => s.data()!)
    expect(updatedUser.retry).toEqual({})
  })
})
