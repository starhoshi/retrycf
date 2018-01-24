import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Retrycf } from 'retrycf'
// import { INeoTask, NeoTask } from '../../../retrycf/src/retrycf'
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'
import { Pring } from 'pring'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)
Pring.initialize(functions.config().firebase)
Retrycf.initialize(functions.config().firebase)

export const helloWorld = functions.https.onRequest((request, response) => {
  // response.send("Hello from Firebase!\n\n")
})

export const createTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onCreate(async event => {
  try {
    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder error', e)
    const neoTask = await Retrycf.NeoTask.setRetry(event, 'createTestOrder', e)
    throw e
  }
})

export const createTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onCreate(async event => {
  try {
    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder2 error', e)
    const neoTask = await Retrycf.NeoTask.setRetry(event, 'createTestOrder2', e)
    throw e
  }
})

export const updateTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onUpdate(async event => {
  try {
    const shouldRetry = Retrycf.NeoTask.shouldRetry(event.data)
    await Retrycf.NeoTask.setFatalIfRetryCountIsMax(event)

    console.log('shouldretry', shouldRetry)

    if (!shouldRetry) {
      return undefined
    }

    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder error', e)
    const neoTask = await Retrycf.NeoTask.setRetry(event, 'createTestOrder', e)
    throw e
  }
})

export const updateTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onUpdate(async event => {
  try {
    const shouldRetry = Retrycf.NeoTask.shouldRetry(event.data)
    await Retrycf.NeoTask.setFatalIfRetryCountIsMax(event)

    console.log('shouldretry', shouldRetry)

    if (!shouldRetry) {
      return undefined
    }

    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder2 error', e)
    const neoTask = await Retrycf.NeoTask.setRetry(event, 'createTestOrder2', e)
    throw e
  }
})

const main = async (event: functions.Event<DeltaDocumentSnapshot>) => {
  console.log('eventID', event.eventId)
  console.log('event', event)
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID
  console.log(testOrderID, event.eventType, 'start')

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(testOrderID, skus, event)
  // await throwErrorDecreaseStock(testOrderID, skus, event)

  console.log(testOrderID, 'finish')

  await Retrycf.NeoTask.success(event)
}

const decreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[], event: functions.Event<DeltaDocumentSnapshot>) => {
  return admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    for (const sku of skuRefs) {
      const t = transaction.get(sku).then(tsku => {
        const newStock = tsku.data()!.stock - 1
        console.log(testOrderID, sku.id, newStock)
        transaction.update(sku, { stock: newStock })
      })
      promises.push(t)
    }
    promises.push(Retrycf.NeoTask.markComplete(event, transaction, 'decreaseStock'))

    return Promise.all(promises)
  })
}

const throwErrorDecreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  return admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    try {
      for (const sku of skuRefs) {
        const t = transaction.get(sku).then(tsku => {
          if (tsku.data()!.index === 2) {
            throw `${testOrderID}, index 3`
          } else {
            const newStock = tsku.data()!.stock - 1
            console.log(testOrderID, sku.id, newStock)
            transaction.update(sku, { stock: newStock })
          }
        })
        promises.push(t)
      }
    } catch (e) {
      console.error(testOrderID, e)
      throw e
    }
    return Promise.all(promises)
  })
}
