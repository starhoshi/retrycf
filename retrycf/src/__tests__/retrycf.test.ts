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

    const updatedOrder = await Model.SampleOrder.get(order.id) as Model.SampleOrder
    expect(updatedOrder.neoTask!.completed).toEqual({})
  })
})

describe('isCompleted', async () => {
  let order: Model.SampleOrder
  beforeEach(async () => {
    order = new Model.SampleOrder()
    order.name = ''
  })

  test('false when neoTask is undefined', async () => {
    order.neoTask = undefined
    expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(false)
  })

  test('false when step is not completed', async () => {
    const completed = { 'other': true }
    const neoTask = new Retrycf.PNeoTask()
    neoTask.completed = completed
    order.neoTask = neoTask.rawValue()

    expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(false)
  })

  test('true when step is completed', async () => {
    const completed = { [step]: true }
    const neoTask = new Retrycf.PNeoTask()
    neoTask.completed = completed
    order.neoTask = neoTask.rawValue()

    expect(Retrycf.PNeoTask.isCompleted(order, 'step')).toEqual(true)
  })
})
