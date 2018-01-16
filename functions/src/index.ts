import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)

export const helloWorld = functions.https.onRequest((request, response) => {
  // response.send("Hello from Firebase!\n\n")
})

export const createTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onCreate(async event => {
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(skus)

  return undefined
})

export const createTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onCreate(async event => {
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID
  console.log(testOrderID, 'stert')

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(skus)

  console.log(testOrderID, 'finish')
  return undefined
})

const decreaseStock = async (skuRefs: FirebaseFirestore.DocumentReference[]) => {
  for (const sku of skuRefs) {
    await admin.firestore().runTransaction(transaction => {
      return transaction.get(sku).then(skuDoc => {
        const newStock = skuDoc.data().stock - 1
        console.log(sku.id, newStock)
        transaction.update(sku, { stock: newStock })
      }).catch(e => {
        console.error(sku.id, e)
        throw 3
      })
    })
  }
}
