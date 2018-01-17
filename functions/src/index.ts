import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)

export const helloWorld = functions.https.onRequest((request, response) => {
  // response.send("Hello from Firebase!\n\n")
})

export const createTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onCreate(async event => {
  try {
    const testOrderData = event.data.data()
    const testOrderID = event.params!.testOrderID
    console.log(testOrderID, 'start')

    const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
    await decreaseStock(testOrderID, skus)
    // await throwErrorDecreaseStock(testOrderID, skus)

    console.log(testOrderID, 'finish')
    return undefined
  } catch (e) {
    console.log('createTestOrder error', e)
    throw e
  }
})

export const createTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onCreate(async event => {
  try {
    const testOrderData = event.data.data()
    const testOrderID = event.params!.testOrderID
    console.log(testOrderID, 'start')

    const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
    await decreaseStock(testOrderID, skus)
    // await throwErrorDecreaseStock(testOrderID, skus)

    console.log(testOrderID, 'finish')
    return undefined
  } catch (e) {
    console.log('createTestOrder2 error', e)
    throw e
  }
})

const decreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  return admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    for (const sku of skuRefs) {
      const t = transaction.get(sku).then(tsku => {
        const newStock = tsku.data().stock - 1
        console.log(testOrderID, sku.id, newStock)
        transaction.update(sku, { stock: newStock })
      })
      promises.push(t)
    }
    return Promise.all(promises)
  })
}

const throwErrorDecreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  return admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    try {
      for (const sku of skuRefs) {
        const t = transaction.get(sku).then(tsku => {
          if (tsku.data().index === 2) {
            throw `${testOrderID}, index 3`
          } else {
            const newStock = tsku.data().stock - 1
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
