import * as admin from 'firebase-admin'
import * as Retrycf from '../new_retrycf'
import * as Rescue from 'rescue-fire'
import 'jest'

jest.setTimeout(20000)
beforeAll(() => {
  const serviceAccount = require('../../../sandbox-329fc-firebase-adminsdk.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  Retrycf.initialize({
    projectId: 'sandbox-329fc',
    keyFilename: '../sandbox-329fc-firebase-adminsdk.json'
  })
})

let user: FirebaseFirestore.DocumentReference
const data = { name: 'test' }
const error = 'An error occured'
const defaultRetry = { count: 1, errors: [{ createdAt: new Date(), error: error }] }

beforeEach(async () => {
  user = await admin.firestore().collection('retrycf-user').add(data)
})

describe('setRetry', () => {
  describe('data not exist retry', async () => {
    test('only 1 error', async () => {
      const event = Rescue.event(user, data)
      const retry = await Retrycf.setRetry(event.data.ref, event.data.data(), error)

      expect(retry.count).toBe(1)
      expect(retry.errors.length).toBe(1)
      expect(retry.errors[0].createdAt).toBeDefined()
      expect(retry.errors[0].error).toBe(error)
    })
  })
  describe('data already exist retry', async () => {
    test('exist multiple error', async () => {
      await user.update({ retry: defaultRetry })
      const event = Rescue.event(user, { name: 'test', retry: defaultRetry })
      const retry = await Retrycf.setRetry(event.data.ref, event.data.data(), error)

      expect(retry.count).toBe(2)
      expect(retry.errors.length).toBe(2)
      expect(retry.errors[0].createdAt).toBe(defaultRetry.errors[0].createdAt)
      expect(retry.errors[0].error).toBe(defaultRetry.errors[0].error)
      expect(retry.errors[1].createdAt).toBeDefined()
      expect(retry.errors[1].error).toBe(error)
    })
  })
})