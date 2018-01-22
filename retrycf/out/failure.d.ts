import { INeoTask } from './retrycf';
import { Pring } from 'pring';
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
export declare class Failure extends Pring.Base {
    ref: FirebaseFirestore.DocumentReference;
    refPath: string;
    neoTask: INeoTask;
    static querySnapshot(refPath: string): Promise<FirebaseFirestore.QuerySnapshot>;
    static setFailure(documentSnapshot: DeltaDocumentSnapshot, neoTask: INeoTask): Promise<FirebaseFirestore.WriteResult | FirebaseFirestore.WriteResult[]>;
    static deleteFailure(ref: FirebaseFirestore.DocumentReference): Promise<void>;
}
