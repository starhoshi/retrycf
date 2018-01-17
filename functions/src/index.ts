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
  for (const sku of skuRefs) {
    await admin.firestore().runTransaction(transaction => {
      return transaction.get(sku).then(skuDoc => {
        const newStock = skuDoc.data().stock - 1
        console.log(testOrderID, sku.id, newStock)
        transaction.update(sku, { stock: newStock })
      })
      .catch(e => {
        console.error(sku.id, e)
        throw e
      })
    })
  }
}

const _decreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
  await admin.firestore().runTransaction(async (transaction) => {

    const hoge: any[] = []

    try {
      for (const sku of skuRefs) {
        const t = await transaction.get(sku)
        const newStock = t.data().stock - 1
        console.log(testOrderID, sku.id, newStock)
        hoge.push({sku: sku,  stock: newStock })
      }
    } catch (e) {
      // console.error(sku.id, e)
      throw e
    }
      // await transaction.get(sku).then(skuDoc => {
      //   const newStock = skuDoc.data().stock - 1
      //   console.log(testOrderID, sku.id, newStock)
      //   transaction.update(sku, { stock: newStock })
      // })
        // .catch(e => {
        //   console.error(sku.id, e)
        //   throw e
        // })
    // }

    // const promise: Promise<any>[] = []
    hoge.forEach(h => {
      transaction.update(h.sku, {stock: h.stock})
    })

    return Promise.resolve()
    // return Promise.all(promise)
  })
}
