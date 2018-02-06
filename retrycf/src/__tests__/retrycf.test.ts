import { Pring, property } from 'pring'
import * as Retrycf from '../retrycf'
import * as Helper from './firebaseHelper'
import * as Model from './sampleModel'
import 'jest'

beforeAll(() => {
  const _ = Helper.Firebase.shared
})

const step = 'step'

test('clearCompleted', async () => {
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
