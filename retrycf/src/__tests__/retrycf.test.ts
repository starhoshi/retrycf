import { Pring, property } from 'pring'
import * as Retrycf from '../retrycf'
import * as Helper from './firebaseHelper'
import * as Model from './sampleModel'
import 'jest'

beforeAll(() => {
  const _ = Helper.Firebase.shared
})

const step = 'step'

describe('clearCompleted', () => {
  test('clear', async () => {
    let order = new Model.SampleOrder()
    order.name = ''
    const neoTask = new Retrycf.PNeoTask()
    const completed = { [step]: true }
    neoTask.completed = completed
    order.neoTask = neoTask.rawValue()
    await order.save()

    expect(order.neoTask!.completed![step]).toEqual(true)

    // chack callback order
    order = await Retrycf.PNeoTask.clearCompleted(order)
    expect(order.neoTask!.completed).toEqual({})

    const fetchedOrder = await Model.SampleOrder.get(order.id) as Model.SampleOrder
    expect(fetchedOrder.neoTask!.completed).toEqual({})
  })
})

describe('isCompleted', async () => {
  let order: Model.SampleOrder
  beforeEach(async () => {
    order = new Model.SampleOrder()
    order.name = ''
  })
  describe('when neoTask is undefined', () => {
    test('false', async () => {
      order.neoTask = undefined
      expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(false)
    })
  })

  describe('when step is not completed', () => {
    test('false', async () => {
      const completed = { 'other': true }
      const neoTask = new Retrycf.PNeoTask()
      neoTask.completed = completed
      order.neoTask = neoTask.rawValue()

      expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(false)
    })
  })

  describe('when step is completed', () => {
    test('true', async () => {
      const completed = { [step]: true }
      const neoTask = new Retrycf.PNeoTask()
      neoTask.completed = completed
      order.neoTask = neoTask.rawValue()

      expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(true)
    })
  })
})

describe('setRetry', async () => {
  let order: Model.SampleOrder
  beforeEach(async () => {
    order = new Model.SampleOrder()
    order.name = ''
    await order.save()
  })

  describe('when retry count is undefined', () => {
    test('retry added and count is 1', async () => {
      order.neoTask = undefined
      const updatedOrder = await Retrycf.PNeoTask.setRetry(order, 'step', 'error')
      expect(updatedOrder.neoTask!.status).toEqual(Retrycf.NeoTaskStatus.failure)
      expect(updatedOrder.neoTask!.retry!.error).toEqual(['error'])
      expect(updatedOrder.neoTask!.retry!.count).toEqual(1)

      const fetchedOrder = await Model.SampleOrder.get(order.id) as Model.SampleOrder
      expect(fetchedOrder.neoTask!.status).toEqual(Retrycf.NeoTaskStatus.failure)
      expect(fetchedOrder.neoTask!.retry!.error).toEqual(['error'])
      expect(fetchedOrder.neoTask!.retry!.count).toEqual(1)

      // check Failure
      const failures = await Retrycf.Failure.querySnapshot(fetchedOrder.reference.path)
      expect(failures.docs.length).toEqual(1)
      const failure = new Retrycf.Failure()
      failure.init(failures.docs[0])
      expect(failure.refPath).toEqual(fetchedOrder.reference.path)
      expect(failure.neoTask.status).toEqual(fetchedOrder.neoTask!.status)
    })
  })

  describe('when retry count is already exist', () => {
    test('count is 2', async () => {
      order.neoTask = undefined
      const updated1Order = await Retrycf.PNeoTask.setRetry(order, 'step', 'error1')
      const updated2Order = await Retrycf.PNeoTask.setRetry(order, 'step', 'error2')
      expect(updated2Order.neoTask!.status).toEqual(Retrycf.NeoTaskStatus.failure)
      expect(updated2Order.neoTask!.retry!.error).toEqual(['error1', 'error2'])
      expect(updated2Order.neoTask!.retry!.count).toEqual(2)

      const fetchedOrder = await Model.SampleOrder.get(order.id) as Model.SampleOrder
      expect(fetchedOrder.neoTask!.status).toEqual(Retrycf.NeoTaskStatus.failure)
      expect(fetchedOrder.neoTask!.retry!.error).toEqual(['error1', 'error2'])
      expect(fetchedOrder.neoTask!.retry!.count).toEqual(2)

      // check Failure
      const failures = await Retrycf.Failure.querySnapshot(fetchedOrder.reference.path)
      expect(failures.docs.length).toEqual(1)
      const failure = new Retrycf.Failure()
      failure.init(failures.docs[0])
      expect(failure.refPath).toEqual(fetchedOrder.reference.path)
      expect(failure.neoTask.status).toEqual(fetchedOrder.neoTask!.status)
    })
  })
})
