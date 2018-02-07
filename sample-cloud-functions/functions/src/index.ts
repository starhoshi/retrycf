import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Retrycf from 'retrycf'
import * as Model from './sampleModel'
// import { INeoTask, NeoTask } from '../../../retrycf/src/retrycf'
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'
import { Pring } from 'pring'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)
Pring.initialize(functions.config().firebase)
Retrycf.initialize(functions.config().firebase)

export const createTestOrder = functions.firestore.document(`${Model.RetryOrder.getPath()}/{testOrderID}`).onCreate(async event => {
  const order = new Model.RetryOrder()
  order.init(event.data)

  try {
    await main(order)
    return undefined
  } catch (e) {
    const neoTask = await Retrycf.NeoTask.setRetry(order, 'createTestOrder', e)
    throw e
  }
})

export const updateTestOrder = functions.firestore.document(`${Model.RetryOrder.getPath()}/{testOrderID}`).onUpdate(async event => {
  const order = new Model.RetryOrder()
  order.init(event.data)
  const preOrder = new Model.RetryOrder()
  preOrder.init(event.data.previous)

  try {
    const shouldRetry = Retrycf.NeoTask.shouldRetry(order, preOrder)
    await Retrycf.NeoTask.setFatalIfRetryCountIsMax(order)

    console.log('shouldretry', shouldRetry)

    if (!shouldRetry) {
      return undefined
    }

    await main(order)
    return undefined
  } catch (e) {
    if (e.constructor === Retrycf.CompletedError) {
      console.log('completed error')
      return undefined
    }

    const neoTask = await Retrycf.NeoTask.setRetry(order, 'createTestOrder', e)
    throw e
  }
})

const main = async (order: Model.RetryOrder) => {
  const skus = await order.skus.get(Model.RetrySKU).then(ss => {
    return ss.map(sku => {
      return admin.firestore().collection(Model.RetrySKU.getPath()).doc(sku.id)
    })
  })

  await decreaseStock(order, skus)
  await Retrycf.NeoTask.setSuccess(order)
}

const decreaseStock = async (order: Model.RetryOrder, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  return admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    for (const sku of skuRefs) {
      const t = transaction.get(sku).then(tsku => {
        const newStock = tsku.data()!.stock - 1
        console.log(order.id, sku.id, newStock)
        transaction.update(sku, { stock: newStock })
      })
      promises.push(t)
    }

    const step = 'stock'
    let neoTask: Retrycf.NeoTask

    const orderRef = admin.firestore().doc(order.getPath())
    const orderPromise = transaction.get(orderRef).then(tref => {
      if (Retrycf.NeoTask.isCompleted(order, step)) {
        throw new Retrycf.CompletedError(step)
      } else {
        neoTask = Retrycf.NeoTask.makeNeoTask(order)
        const completed = { [step]: true }
        neoTask.completed = completed
        console.log('transaction order', order.rawValue())
        transaction.update(orderRef, { neoTask: neoTask.rawValue() })
      }
    })
    promises.push(orderPromise)

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
