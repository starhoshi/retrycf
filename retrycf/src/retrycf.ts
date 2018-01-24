import * as functions from 'firebase-functions'
import * as FirebaseFirestore from '@google-cloud/firestore'
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'
import * as admin from 'firebase-admin'
import { Pring, property } from 'pring'

var firestore: FirebaseFirestore.Firestore

export namespace Retrycf {
  export function initialize(options?: any) {
    firestore = new FirebaseFirestore.Firestore(options)
    Pring.initialize(options)
  }

  export class Failure extends Pring.Base {
    @property ref: FirebaseFirestore.DocumentReference
    @property refPath: string
    @property neoTask: INeoTask

    static querySnapshot(refPath: string) {
      return firestore.collection('version/1/failure')
        .where('refPath', '==', refPath)
        .get()
    }

    static async setFailure(documentSnapshot: DeltaDocumentSnapshot, neoTask: INeoTask) {
      const querySnapshot = await Failure.querySnapshot(documentSnapshot.ref.path)

      if (querySnapshot.docs.length === 0) {
        const failure = new Failure()
        // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
        // failure.ref = documentSnapshot.ref
        failure.refPath = documentSnapshot.ref.path
        failure.neoTask = neoTask
        return failure.save()
      } else {
        const failure = new Failure()
        failure.init(querySnapshot.docs[0])
        // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
        // failure.ref = documentSnapshot.ref
        failure.refPath = documentSnapshot.ref.path
        failure.neoTask = neoTask
        return failure.update()
      }
    }

    static async deleteFailure(ref: FirebaseFirestore.DocumentReference) {
      const querySnapshot = await Failure.querySnapshot(ref.path)

      for (const doc of querySnapshot.docs) {
        const failure = new Failure()
        failure.init(doc)
        await failure.delete()
      }
    }
  }

  export enum NeoTaskStatus {
    none = 0,
    success = 1,
    failure = 2
  }

  export interface INeoTask {
    status: NeoTaskStatus
    completed: { [id: string]: boolean }
    invalid?: { validationError: string, reason: string }
    retry?: { error: any[], count: number }
    fatal?: { step: string, error: string }
  }

  export class NeoTask implements INeoTask {
    status: NeoTaskStatus = NeoTaskStatus.none
    completed: { [id: string]: boolean } = {}
    invalid?: { validationError: string, reason: string }
    retry?: { error: any[], count: number }
    fatal?: { step: string, error: string }

    static async markComplete(event: functions.Event<DeltaDocumentSnapshot>, transaction: FirebaseFirestore.Transaction, step: string) {
      return transaction.get(event.data.ref).then(tref => {
        if (NeoTask.isCompleted(event, step)) {
          throw new CompletedError(step)
        } else {
          const neoTask = new NeoTask(event.data)
          neoTask.completed[step] = true
          console.log('will save data', event.data.data())
          transaction.update(event.data.ref, { flag: true })
          console.log('saved data', event.data.data())
        }
      })
    }

    static isCompleted(event: functions.Event<DeltaDocumentSnapshot>, step: string) {
      const neoTask = new NeoTask(event.data)
      console.log(!!neoTask.completed[step])
      return !!neoTask.completed[step]
    }

    static async setRetry(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any) {
      const neoTask = new NeoTask(event.data)

      if (!neoTask.retry) {
        neoTask.retry = { error: new Array(), count: 0 }
      }

      neoTask.status = NeoTaskStatus.failure
      neoTask.retry.error.push(error.toString())
      neoTask.retry.count += 1 // これをトリガーにして再実行する

      await event.data.ref.update({ neoTask: neoTask.rawValue() })
      await Failure.setFailure(event.data, neoTask.rawValue())

      return neoTask
    }

    static async setInvalid(event: functions.Event<DeltaDocumentSnapshot>, error: ValidationError) {
      const neoTask = new NeoTask(event.data)

      neoTask.invalid = {
        validationError: error.validationErrorType,
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

      console.log('fatal_error', event.data.ref.id)

      await event.data.ref.update({ neoTask: neoTask.rawValue() })
      await Failure.setFailure(event.data, neoTask.rawValue())

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
      const neoTask: INeoTask = { status: NeoTaskStatus.success, completed: {} }
      await event.data.ref.update({ neoTask: neoTask })
      await Failure.deleteFailure(event.data.ref)
    }

    constructor(deltaDocumentSnapshot: DeltaDocumentSnapshot) {
      this.status = NeoTaskStatus.failure
      const neoTask = deltaDocumentSnapshot.data().neoTask
      if (neoTask) {
        if (neoTask.invalid) { this.invalid = neoTask.invalid }
        if (neoTask.retry) { this.retry = neoTask.retry }
        if (neoTask.fatal) { this.fatal = neoTask.fatal }
      }
    }

    rawValue(): INeoTask {
      const neoTask: INeoTask = { status: this.status, completed: {} }
      if (this.invalid) { neoTask.invalid = this.invalid }
      if (this.retry) { neoTask.retry = this.retry }
      if (this.fatal) { neoTask.fatal = this.fatal }
      return neoTask
    }
  }

  export class CompletedError extends Error {
    step: string

    constructor(step: string) {
      super()
      this.step = step
    }
  }

  export class ValidationError extends Error {
    validationErrorType: string
    reason: string
    option?: any

    constructor(validationErrorType: string, reason: string) {
      super()
      this.validationErrorType = validationErrorType
      this.reason = reason
    }
  }
}
