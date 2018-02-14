import * as functions from 'firebase-functions'
import * as FirebaseFirestore from '@google-cloud/firestore'

let _firestore: FirebaseFirestore.Firestore
let _maxRetryCount: number = 2

/**
 * Initialize in your index.ts.
 * @param adminOptions functions.config().firebase
 * @param options maxRetryCount
 */
export const initialize = (adminOptions: any, options?: { maxRetryCount: number }) => {
  _firestore = new FirebaseFirestore.Firestore(adminOptions)
  if (options) {
    _maxRetryCount = options.maxRetryCount
  }
}

/**
 * Retrycf.Status
 */
export enum Status {
  /** should not retry */
  ShouldNotRetry = 'ShouldRetry',
  /** should retry */
  ShouldRetry = 'ShouldRetry',
  /** retry failed */
  RetryFailed = 'RetryFailed'
}

/**
 * Parameters to be saved by setRetry()
 */
export interface IRetry {
  /** retry count */
  count: number
  /** Record retry reason */
  errors: { createdAt: Date, error: any, stack: string }[]
}

const makeRetry = (data: any, error: Error): IRetry => {
  const currentError = { createdAt: new Date(), error: error.toString(), stack: error.stack || '' }
  let retry = { count: 0, errors: new Array() }
  if (data.retry && data.retry.count) {
    retry = data.retry
  }

  retry.count += 1
  retry.errors.push(currentError)
  return retry
}

/**
 * save retry parameters.
 * @param ref event.data.ref
 * @param data event.data.data()
 * @param error Error
 */
export const setRetry = async (ref: FirebaseFirestore.DocumentReference, data: any, error: Error): Promise<IRetry> => {
  const retry = makeRetry(data, error)
  await ref.update({ retry: retry })
  return retry
}

/**
 * Get retry count from data
 * @param data event.data.data()
 */
const getRetryCount = (data?: any) => {
  if (!data) {
    return undefined
  }
  if (!data.retry) {
    return undefined
  }
  if (!data.retry.count) {
    return undefined
  }
  return data.retry.count
}

/**
 * If retry.count is increasing from previousData, it returns ShouldRetry.
 * If retry.count is increased from previousData and it exceeds max retry count, RetryFailed is returned.
 * @param data event.data.data()
 * @param previousData event.data.previous.data()
 * @param maxRetryCount optional. If you change maxRetryCount, set number.
 */
export const retryStatus = (data: any, previousData: any, maxRetryCount: number = _maxRetryCount): Status => {
  const currentCount: number | undefined = getRetryCount(data)
  const previousCount: number | undefined = getRetryCount(previousData)

  if (currentCount === undefined) {
    return Status.ShouldNotRetry
  }

  if (previousCount === undefined && currentCount === 1) {
    return Status.ShouldRetry
  }

  if (previousCount !== undefined && currentCount === previousCount + 1) {
    if (currentCount > maxRetryCount) {
      return Status.RetryFailed
    } else {
      return Status.ShouldRetry
    }
  }

  return Status.ShouldNotRetry
}

/**
 * update retry to {}.
 * @param ref event.data.ref
 */
export const clear = async (ref: FirebaseFirestore.DocumentReference) => {
  await ref.update({ retry: {} })
  return {}
}
