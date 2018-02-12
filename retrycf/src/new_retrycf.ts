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

export enum Status {
  ShouldNotRetry = 'ShouldRetry',
  ShouldRetry = 'ShouldRetry',
  RetryFailed = 'RetryFailed'
}

export interface IRetry {
  count: number
  errors: { createdAt: Date, error: any }[]
}

const makeRetry = (data: any, error: any): IRetry => {
  const currentError = { createdAt: new Date(), error: error }
  let retry = { count: 0, errors: new Array() }
  if (data.retry && data.retry.count) {
    retry = data.retry
  }

  retry.count += 1
  retry.errors.push(currentError)
  return retry
}

export const setRetry = async (ref: FirebaseFirestore.DocumentReference, data: any, error: any): Promise<IRetry> => {
  const retry = makeRetry(data, error)
  await ref.update({ retry: retry })
  return retry
}

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

export const retryStatus = (data: any, previousData: any, maxRetryCount: number = _maxRetryCount): Status => {
  const currentCount: number | undefined = getRetryCount(data)
  const previousCount: number | undefined = getRetryCount(previousData)

  if (!currentCount) {
    return Status.ShouldNotRetry
  }

  // Not retry more than max times
  // For example: currentCount(3) > maxRetryCount(2)
  if (currentCount > maxRetryCount) {
    return Status.RetryFailed
  }

  // Current neoTask.retry exists, but previous neoTask.retry does not exist
  // For example: currentCount(1), previousCount(undfined)
  if (!previousCount) {
    return Status.ShouldRetry
  }

  // Returns true if the current retry count has increased from the previous retry count.
  // For example:
  //      true: currentCount(2), previousCount(1)
  //      false: currentCount(2), previousCount(2)
  if (currentCount > previousCount) {
    return Status.ShouldRetry
  }

  return Status.ShouldNotRetry
}

export const clear = (ref: FirebaseFirestore.DocumentReference) => {
  return ref.update({ retry: {} })
}
