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

export const clear = async (ref: FirebaseFirestore.DocumentReference) => {
  await ref.update({ retry: {} })
  return {}
}
