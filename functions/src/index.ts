import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)

export const helloWorld = functions.https.onRequest((request, response) => {
  // response.send("Hello from Firebase!\n\n")
})

export const createTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onCreate(async event => {
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID

  console.log(testOrderID, 'start')

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(testOrderID, skus)

  console.log(testOrderID, 'finish')

  return undefined
})

export const createTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onCreate(async event => {
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID
  console.log(testOrderID, 'start')

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(testOrderID, skus)

  console.log(testOrderID, 'finish')
  return undefined
})

const decreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  await admin.firestore().runTransaction(async (transaction) => {
    const promises: Promise<any>[] = []
    try {
      for (const sku of skuRefs) {
        const t = transaction.get(sku).then(tsku => {
          const newStock = tsku.data().stock - 1
          console.log(testOrderID, sku.id, newStock)
          transaction.update(sku, { stock: newStock })
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
