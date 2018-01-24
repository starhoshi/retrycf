import * as functions from 'firebase-functions';
import * as FirebaseFirestore from '@google-cloud/firestore';
import { DeltaDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Pring } from 'pring';
export declare namespace Retrycf {
    function initialize(options?: any): void;
    class CompletedError extends Error {
        step: string;
        constructor(step: string);
    }
    class ValidationError extends Error {
        validationErrorType: string;
        reason: string;
        option?: any;
        constructor(validationErrorType: string, reason: string);
    }
    class Failure extends Pring.Base {
        ref: FirebaseFirestore.DocumentReference;
        refPath: string;
        neoTask: INeoTask;
        static querySnapshot(refPath: string): Promise<FirebaseFirestore.QuerySnapshot>;
        static setFailure(documentSnapshot: DeltaDocumentSnapshot, neoTask: INeoTask): Promise<FirebaseFirestore.WriteResult | FirebaseFirestore.WriteResult[]>;
        static deleteFailure(ref: FirebaseFirestore.DocumentReference): Promise<void>;
    }
    enum NeoTaskStatus {
        none = 0,
        success = 1,
        failure = 2,
    }
    interface INeoTask {
        status: NeoTaskStatus;
        completed: {
            [id: string]: boolean;
        };
        invalid?: {
            validationError: string;
            reason: string;
        };
        retry?: {
            error: any[];
            count: number;
        };
        fatal?: {
            step: string;
            error: string;
        };
    }
    class NeoTask implements INeoTask {
        status: NeoTaskStatus;
        completed: {
            [id: string]: boolean;
        };
        invalid?: {
            validationError: string;
            reason: string;
        };
        retry?: {
            error: any[];
            count: number;
        };
        fatal?: {
            step: string;
            error: string;
        };
        static markComplete(event: functions.Event<DeltaDocumentSnapshot>, transaction: FirebaseFirestore.Transaction, step: string): Promise<void>;
        static isCompleted(event: functions.Event<DeltaDocumentSnapshot>, step: string): boolean;
        static setRetry(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any): Promise<NeoTask>;
        static setInvalid(event: functions.Event<DeltaDocumentSnapshot>, error: ValidationError): Promise<NeoTask>;
        static setFatal(event: functions.Event<DeltaDocumentSnapshot>, step: string, error: any): Promise<NeoTask>;
        private static getRetryCount(data);
        private static MAX_RETRY_COUNT;
        static shouldRetry(data: DeltaDocumentSnapshot): boolean;
        static setFatalIfRetryCountIsMax(event: functions.Event<DeltaDocumentSnapshot>): Promise<NeoTask | undefined>;
        static success(event: functions.Event<DeltaDocumentSnapshot>): Promise<void>;
        constructor(deltaDocumentSnapshot: DeltaDocumentSnapshot);
        rawValue(): INeoTask;
    }
}
