import * as admin from 'firebase-admin'
import 'jest'

beforeAll(() => {
  const serviceAccount = require('../../sandbox-329fc-firebase-adminsdk.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
})

it('order create', async () => {
  const skuData = [...Array(3).keys()].map(a => {
    return { price: 5000, stock: 1000 }
  })
  const skus = await Promise.all(skuData.map(data => {
    return admin.firestore().collection('version/1/testsku').add(data)
  }))

  const testOrderColRef = admin.firestore().collection('version/1/testorder')
  const testOrderColRef2 = admin.firestore().collection('version/1/testorder2')
  const testOrders = [...Array(300).keys()].map(a => {
    const testOrder: any = {}
    testOrder.orderSKUs = skus
    return testOrder
  })
  await Promise.all(testOrders.map(testOrder => {
    return testOrderColRef.add(testOrder)
  }))
  await Promise.all(testOrders.map(testOrder => {
    return testOrderColRef2.add(testOrder)
  }))
  // await Promise.all(testOrders.map(testOrder => {
  //   return testOrderColRef.add(testOrder)
  // }))
  // await Promise.all(testOrders.map(testOrder => {
  //   return testOrderColRef2.add(testOrder)
  // }))

  expect(true)
})
