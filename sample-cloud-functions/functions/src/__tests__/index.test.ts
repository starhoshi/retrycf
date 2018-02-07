import * as admin from 'firebase-admin'
import * as Model from '../sampleModel'
import 'jest'
import { Pring } from 'pring'

beforeAll(() => {
  const serviceAccount = require('../../../../sandbox-329fc-firebase-adminsdk.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  Pring.initialize({
    projectId: 'sandbox-329fc',
    keyFilename: '../../sandbox-329fc-firebase-adminsdk.json'
  })
})

it('order create', async () => {
  jest.setTimeout(1000000)

  const skus = [...Array(3).keys()].map(index => {
    // return { price: 5000, stock: 1000, index: index }
    const sku = new Model.RetrySKU()
    sku.index = index
    return sku
  })
  await Promise.all(skus.map(sku => {
    return sku.save()
  }))

  const testOrders = [...Array(200).keys()].map(a => {
    const testOrder = new Model.RetryOrder()
    skus.forEach(sku => {
      testOrder.skus.insert(sku)
    })
    return testOrder
  })

  // await addOrdersPer02(testOrders)
  await addOrdersAtOnce(testOrders)

  expect(true)
})

const addOrdersAtOnce = async (testOrders: Model.RetryOrder[]) => {
  await Promise.all(testOrders.map(testOrder => {
    return testOrder.save()
  }))
}

const addOrdersPer02 = async (testOrders: Model.RetryOrder[]) => {
  for (const testOrder of testOrders) {
    await sleep(0.2)
    await testOrder.save()
  }
}

const sleep = (milliseconds: number) => {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), milliseconds)
  })
}
