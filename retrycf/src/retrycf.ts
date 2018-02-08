import * as functions from 'firebase-functions'
import * as FirebaseFirestore from '@google-cloud/firestore'
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'
import * as admin from 'firebase-admin'
import { Pring, property } from 'pring'
import { FieldValue } from '@google-cloud/firestore'

var firestore: FirebaseFirestore.Firestore

export function initialize(options?: any) {
  firestore = new FirebaseFirestore.Firestore(options)
  Pring.initialize(options)
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

export class Failure<T extends HasNeoTask> extends Pring.Base {
  @property ref: FirebaseFirestore.DocumentReference
  @property refPath: string
  @property neoTask: NeoTask

  static querySnapshot(refPath: string) {
    return firestore.collection('version/1/failure')
      .where('refPath', '==', refPath)
      .get()
  }

  static async setFailure<T extends HasNeoTask>(model: T, neoTask: NeoTask) {
    const querySnapshot = await Failure.querySnapshot(model.reference.path)

    if (querySnapshot.docs.length === 0) {
      const failure = new Failure()
      // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
      // failure.ref = documentSnapshot.ref
      failure.refPath = model.reference.path
      failure.neoTask = neoTask.rawValue()
      return failure.save()
    } else {
      const failure = new Failure()
      failure.init(querySnapshot.docs[0])
      // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
      // failure.ref = documentSnapshot.ref
      failure.refPath = model.reference.path
      failure.neoTask = neoTask.rawValue()
      return failure.update()
    }
  }

  static async deleteFailure<T extends HasNeoTask>(model: T) {
    const querySnapshot = await Failure.querySnapshot(model.reference.path)

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

export interface HasNeoTask extends Pring.Base {
  neoTask?: NeoTask
}

export class NeoTask extends Pring.Base {
  @property status?: NeoTaskStatus
  @property completed?: { [id: string]: boolean }
  @property invalid?: { validationError: string, reason: string }
  @property retry?: { error: any[], count: number }
  @property fatal?: { step: string, error: string }

  static async clearCompleted<T extends HasNeoTask>(model: T) {
    let neoTask = NeoTask.makeNeoTask(model)
    delete neoTask.completed
    model.neoTask = neoTask.rawValue()
    await model.reference.update({ neoTask: neoTask.rawValue() })
    return model
  }

  static isCompleted<T extends HasNeoTask>(model: T, step: string) {
    if (!model.neoTask) { return false }
    if (!model.neoTask.completed) { return false }

    return !!model.neoTask.completed[step]
  }

  static makeNeoTask<T extends HasNeoTask>(model: T) {
    let neoTask = new NeoTask()
    if (model.neoTask) {
      if (model.neoTask.status) { neoTask.status = model.neoTask.status }
      if (model.neoTask.completed) { neoTask.completed = model.neoTask.completed }
      if (model.neoTask.invalid) { neoTask.invalid = model.neoTask.invalid }
      if (model.neoTask.retry) { neoTask.retry = model.neoTask.retry }
      if (model.neoTask.fatal) { neoTask.fatal = model.neoTask.fatal }
    }
    return neoTask
  }

  static async setRetry<T extends HasNeoTask>(model: T, step: string, error: any) {
    let neoTask = NeoTask.makeNeoTask(model)

    if (!neoTask.retry) {
      neoTask.retry = { error: new Array(), count: 0 }
    }

    neoTask.status = NeoTaskStatus.failure
    neoTask.retry.error.push(error.toString())
    neoTask.retry.count += 1 // これをトリガーにして再実行する

    await model.reference.update({ neoTask: neoTask.rawValue() })
    await Failure.setFailure(model, neoTask)

    model.neoTask = neoTask.rawValue()

    return model
  }

  static async setInvalid<T extends HasNeoTask>(model: T, error: ValidationError) {
    let neoTask = NeoTask.makeNeoTask(model)

    neoTask.status = NeoTaskStatus.failure
    neoTask.invalid = {
      validationError: error.validationErrorType,
      reason: error.reason
    }

    await model.reference.update({ neoTask: neoTask.rawValue() })

    model.neoTask = neoTask.rawValue()

    return model
  }

  static async setFatal<T extends HasNeoTask>(model: T, step: string, error: any) {
    let neoTask = NeoTask.makeNeoTask(model)

    neoTask.status = NeoTaskStatus.failure
    neoTask.fatal = {
      step: step,
      error: error.toString()
    }

    await model.reference.update({ neoTask: neoTask.rawValue() })
    await Failure.setFailure(model, neoTask)

    model.neoTask = neoTask.rawValue()

    return model
  }

  static getRetryCount<T extends HasNeoTask>(model: T): number | undefined {
    let neoTask = NeoTask.makeNeoTask(model)

    if (!neoTask.retry) {
      return undefined
    }

    return neoTask.retry.count
  }

  private static MAX_RETRY_COUNT = 3
  static shouldRetry<T extends HasNeoTask>(model: T, previoudModel?: T): boolean {
    const currentRetryCount = NeoTask.getRetryCount(model)
    const previousRetryCount = previoudModel && NeoTask.getRetryCount(previoudModel)

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

  static async setFatalIfRetryCountIsMax<T extends HasNeoTask>(model: T, previoudModel?: T) {
    const currentRetryCount = NeoTask.getRetryCount(model)
    const previousRetryCount = previoudModel && NeoTask.getRetryCount(previoudModel)

    if (currentRetryCount && previousRetryCount) {
      if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT && currentRetryCount > previousRetryCount) {
        model = await NeoTask.setFatal(model, 'retry_failed', 'retry failed')
      }
    }

    return model
  }

  static async setSuccess<T extends HasNeoTask>(model: T) {
    let neoTask = new NeoTask()
    neoTask.status = NeoTaskStatus.success
    if (model.neoTask && model.neoTask.completed) { neoTask.completed = model.neoTask.completed }

    await model.reference.update({ neoTask: neoTask.rawValue() })
    await Failure.deleteFailure(model)

    model.neoTask = neoTask.rawValue()

    return model
  }
}

// export interface INeoTask {
//   status: NeoTaskStatus
//   completed: { [id: string]: boolean }
//   invalid?: { validationError: string, reason: string }
//   retry?: { error: any[], count: number }
//   fatal?: { step: string, error: string }
// }

// // TODO: Task を2回上書き保存した時に古いのが消える
// export class NeoTask implements INeoTask {
//   status: NeoTaskStatus = NeoTaskStatus.none
//   completed: { [id: string]: boolean } = {}
//   invalid?: { validationError: string, reason: string }
//   retry?: { error: any[], count: number }
//   fatal?: { step: string, error: string }

//   static async markComplete(event: functions.Event<DeltaDocumentSnapshot>, transaction: FirebaseFirestore.Transaction, step: string) {
//     const ref = firestore.doc(event.data.ref.path)
//     console.log('retrycf ref', ref)
//     return transaction.get(ref).then(tref => {
//       if (NeoTask.isCompleted(event, step)) {
//         throw new CompletedError(step)
//       } else {
//         const neoTask = new NeoTask(event.data)
//         neoTask.completed[step] = true
//         transaction.update(ref, { neoTask: neoTask.rawValue() })
//       }
//     })
//   }

//   static async clearComplete(event: functions.Event<DeltaDocumentSnapshot>) {
//     const neoTask = new NeoTask(event.data)
//     neoTask.completed = {}
//     await event.data.ref.update({ neoTask: neoTask.rawValue() })
//     event.data.data().neoTask = neoTask.rawValue()
//   }

//   static isCompleted(event: functions.Event<DeltaDocumentSnapshot>, step: string) {
//     const neoTask = new NeoTask(event.data)
//     return !!neoTask.completed[step]
//   }

//   static async setRetry(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any) {
//     const neoTask = new NeoTask(event.data)

//     if (!neoTask.retry) {
//       neoTask.retry = { error: new Array(), count: 0 }
//     }

//     neoTask.status = NeoTaskStatus.failure
//     neoTask.retry.error.push(error.toString())
//     neoTask.retry.count += 1 // これをトリガーにして再実行する

//     await event.data.ref.update({ neoTask: neoTask.rawValue() })
//     // await Failure.setFailure(event.data, neoTask.rawValue())

//     return neoTask
//   }

//   static async setInvalid(event: functions.Event<DeltaDocumentSnapshot>, error: ValidationError) {
//     const neoTask = new NeoTask(event.data)

//     neoTask.invalid = {
//       validationError: error.validationErrorType,
//       reason: error.reason
//     }

//     await event.data.ref.update({ neoTask: neoTask.rawValue() })

//     return neoTask
//   }

//   static async setFatal(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any) {
//     const neoTask = new NeoTask(event.data)

//     neoTask.fatal = {
//       step: step,
//       error: error.toString()
//     }

//     console.log('fatal_error', event.data.ref.id)

//     await event.data.ref.update({ neoTask: neoTask.rawValue() })
//     // await Failure.setFailure(event.data, neoTask.rawValue())

//     return neoTask
//   }

//   private static getRetryCount(data: DeltaDocumentSnapshot): number | undefined {
//     const snapshotData = data.data()
//     const currentNeoTask = snapshotData && <INeoTask>snapshotData.neoTask

//     if (!(currentNeoTask && currentNeoTask.retry && currentNeoTask.retry.count)) {
//       return undefined
//     }

//     return currentNeoTask.retry.count
//   }

//   private static MAX_RETRY_COUNT = 3
//   static shouldRetry(data: DeltaDocumentSnapshot): boolean {
//     const currentRetryCount = NeoTask.getRetryCount(data)
//     const previousRetryCount = data.previous && NeoTask.getRetryCount(data.previous)

//     if (!currentRetryCount) {
//       return false
//     }

//     // リトライカウントが3回以上だったら retry しない
//     if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT) {
//       return false
//     }

//     // リトライカウントがあるけど previous にはない
//     if (!previousRetryCount) {
//       return true // 新しく retry が生成されたということになるので true
//     }

//     // retry count が前回から変更されていたら retry する
//     return currentRetryCount > previousRetryCount
//   }

//   static async setFatalIfRetryCountIsMax(event: functions.Event<DeltaDocumentSnapshot>) {
//     const currentRetryCount = NeoTask.getRetryCount(event.data)
//     const previousRetryCount = event.data.previous && NeoTask.getRetryCount(event.data.previous)

//     if (currentRetryCount && previousRetryCount) {
//       if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT && currentRetryCount > previousRetryCount) {
//         return NeoTask.setFatal(event, 'retry_failed', 'retry failed')
//       }
//     }
//   }

//   static async success(event: functions.Event<DeltaDocumentSnapshot>) {
//     const neoTask: INeoTask = { status: NeoTaskStatus.success, completed: {} }
//     await event.data.ref.update({ neoTask: neoTask })
//     await Failure.deleteFailure(event.data.ref)
//   }

//   constructor(deltaDocumentSnapshot: DeltaDocumentSnapshot) {
//     const neoTask = deltaDocumentSnapshot.data().neoTask
//     if (neoTask) {
//       if (neoTask.status) { this.status = neoTask.status }
//       if (neoTask.completed) { this.completed = neoTask.completed }
//       if (neoTask.invalid) { this.invalid = neoTask.invalid }
//       if (neoTask.retry) { this.retry = neoTask.retry }
//       if (neoTask.fatal) { this.fatal = neoTask.fatal }
//     }
//   }

//   rawValue(): INeoTask {
//     const neoTask: INeoTask = { status: this.status, completed: {} }
//     if (this.invalid) { neoTask.invalid = this.invalid }
//     if (this.retry) { neoTask.retry = this.retry }
//     if (this.fatal) { neoTask.fatal = this.fatal }
//     return neoTask
//   }
// }
