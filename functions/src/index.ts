import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(<admin.AppOptions>functions.config().firebase)

export const helloWorld = functions.https.onRequest((request, response) => {
  // response.send("Hello from Firebase!\n\n")
})

export const createTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onCreate(async event => {
  try {
    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder error', e)
    const neoTask = await NeoTask.setRetry(event, 'createTestOrder', e)
    throw e
  }
})

export const createTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onCreate(async event => {
  try {
    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder2 error', e)
    const neoTask = await NeoTask.setRetry(event, 'createTestOrder2', e)
    throw e
  }
})

export const updateTestOrder = functions.firestore.document(`/version/1/testorder/{testOrderID}`).onUpdate(async event => {
  try {
    const shouldRetry = NeoTask.shouldRetry(event.data)
    await NeoTask.setFatalIfRetryCountIsMax(event)

    console.log('shouldretry', shouldRetry)

    if (!shouldRetry) {
      return undefined
    }

    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder error', e)
    const neoTask = await NeoTask.setRetry(event, 'createTestOrder', e)
    throw e
  }
})

export const updateTestOrder2 = functions.firestore.document(`/version/1/testorder2/{testOrderID}`).onUpdate(async event => {
  try {
    const shouldRetry = NeoTask.shouldRetry(event.data)
    await NeoTask.setFatalIfRetryCountIsMax(event)

    console.log('shouldretry', shouldRetry)

    if (!shouldRetry) {
      return undefined
    }

    await main(event)
    return undefined
  } catch (e) {
    console.log('createTestOrder2 error', e)
    const neoTask = await NeoTask.setRetry(event, 'createTestOrder2', e)
    throw e
  }
})

const main = async (event: functions.Event<DeltaDocumentSnapshot>) => {
  const testOrderData = event.data.data()
  const testOrderID = event.params!.testOrderID
  console.log(testOrderID, event.eventType, 'start')

  const skus = <FirebaseFirestore.DocumentReference[]>testOrderData.orderSKUs
  await decreaseStock(testOrderID, skus)
  // await throwErrorDecreaseStock(testOrderID, skus)

  console.log(testOrderID, 'finish')
}

const decreaseStock = async (testOrderID: string, skuRefs: FirebaseFirestore.DocumentReference[]) => {
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

export enum TaskStatus {
  none = 0,
  success = 1,
  failure = 2
}

import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'

export interface INeoTask {
  status: TaskStatus
  invalid?: { validationErrorType: ValidationErrorType, reason: string }
  retry?: { error: any[], count: number }
  fatal?: { step: string, error: string }
}

export class NeoTask implements INeoTask {
  status: TaskStatus
  invalid?: { validationErrorType: ValidationErrorType, reason: string }
  retry?: { error: any[], count: number }
  fatal?: { step: string, error: string }

  static async setRetry(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any) {
    const neoTask = new NeoTask(event.data)

    if (!neoTask.retry) {
      neoTask.retry = { error: new Array(), count: 0 }
    }

    neoTask.status = TaskStatus.failure
    neoTask.retry.error.push(error.toString())
    neoTask.retry.count += 1 // これをトリガーにして再実行する

    console.log(neoTask)

    await event.data.ref.update({ neoTask: neoTask.rawValue() })
    // await Firebase.Failure.setFailure(event.data, neoTask.rawValue())

    return neoTask
  }

  static async setInvalid(event: functions.Event<DeltaDocumentSnapshot>, error: ValidationError) {
    const neoTask = new NeoTask(event.data)

    neoTask.invalid = {
      validationErrorType: error.validationErrorType,
      reason: error.reason
    }

    await event.data.ref.update({ neoTask: neoTask.rawValue() })

    return neoTask
  }

  static async setFatal(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any) {
    const neoTask = new NeoTask(event.data)

    neoTask.fatal = {
      step: step,
      error: error.toString()
    }

    console.error('fatal_error', event.data.ref.id)

    await event.data.ref.update({ neoTask: neoTask.rawValue() })
    // await Firebase.Failure.setFailure(event.data, neoTask.rawValue())

    return neoTask
  }

  private static getRetryCount(data: DeltaDocumentSnapshot): number | undefined {
    const snapshotData = data.data()
    const currentNeoTask = snapshotData && <INeoTask>snapshotData.neoTask

    if (!(currentNeoTask && currentNeoTask.retry && currentNeoTask.retry.count)) {
      return undefined
    }

    return currentNeoTask.retry.count
  }

  private static MAX_RETRY_COUNT = 3
  static shouldRetry(data: DeltaDocumentSnapshot): boolean {
    const currentRetryCount = NeoTask.getRetryCount(data)
    const previousRetryCount = data.previous && NeoTask.getRetryCount(data.previous)

    if (!currentRetryCount) {
      return false
    }

    // リトライカウントが3回以上だったら retry しない
    if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT) {
      return false
    }

    // リトライカウントがあるけど previous にはない
    if (!previousRetryCount) {
      return true // 新しく retry が生成されたということになるので true
    }

    // retry count が前回から変更されていたら retry する
    return currentRetryCount > previousRetryCount
  }

  static async setFatalIfRetryCountIsMax(event: functions.Event<DeltaDocumentSnapshot>) {
    const currentRetryCount = NeoTask.getRetryCount(event.data)
    const previousRetryCount = event.data.previous && NeoTask.getRetryCount(event.data.previous)

    if (currentRetryCount && previousRetryCount) {
      if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT && currentRetryCount > previousRetryCount) {
        return NeoTask.setFatal(event, 'retry_failed', 'retry failed')
      }
    }
  }

  static async success(event: functions.Event<DeltaDocumentSnapshot>) {
    const neoTask: INeoTask = { status: TaskStatus.success }
    await event.data.ref.update({ neoTask: neoTask })
    // await Firebase.Failure.deleteFailure(event.data.ref)
  }

  constructor(deltaDocumentSnapshot: DeltaDocumentSnapshot) {
    this.status = TaskStatus.failure
    const neoTask = deltaDocumentSnapshot.data().neoTask
    if (neoTask) {
      if (neoTask.invalid) { this.invalid = neoTask.invalid }
      if (neoTask.retry) { this.retry = neoTask.retry }
      if (neoTask.fatal) { this.fatal = neoTask.fatal }
    }
  }

  rawValue(): INeoTask {
    const neoTask: INeoTask = { status: this.status }
    if (this.invalid) { neoTask.invalid = this.invalid }
    if (this.retry) { neoTask.retry = this.retry }
    if (this.fatal) { neoTask.fatal = this.fatal }
    return neoTask
  }
}

export enum ValidationErrorType {
  ShopIsNotActive = 'ShopIsNotActive',
  SKUIsNotActive = 'SKUIsNotActive',
  OutOfStock = 'OutOfStock',
  StripeCardError = 'StripeCardError',
  StripeInvalidRequestError = 'StripeInvalidRequestError',
  StripeCardExpired = 'StripeCardExpired'
}

export class ValidationError extends Error {
  validationErrorType: ValidationErrorType
  reason: string
  option?: any

  constructor(validationErrorType: ValidationErrorType, reason: string) {
    super()
    this.validationErrorType = validationErrorType
    this.reason = reason
  }
}

export class FlowError extends Error {
  task: INeoTask
  error: any

  constructor(task: INeoTask, error: any) {
    super()
    this.task = task
    this.error = error
  }
}
