import * as admin from 'firebase-admin'
import { INeoTask } from './retrycf'
import { Pring, property } from 'pring'
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore'

export class Failure extends Pring.Base {
  @property ref: FirebaseFirestore.DocumentReference
  @property refPath: string
  @property neoTask: INeoTask

  static querySnapshot(refPath: string) {
    return admin.firestore().collection('version/1/failure')
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

    console.log('deletefailure', querySnapshot.docs)

    for (const doc of querySnapshot.docs) {
      const failure = new Failure()
      failure.init(doc)
      await failure.delete()
    }
  }
}
