import * as FirebaseFirestore from '@google-cloud/firestore';
import { Pring } from 'pring';
export declare function initialize(options?: any): void;
export declare class CompletedError extends Error {
    step: string;
    constructor(step: string);
}
export declare class ValidationError extends Error {
    validationErrorType: string;
    reason: string;
    option?: any;
    constructor(validationErrorType: string, reason: string);
}
export declare class Failure<T extends HasNeoTask> extends Pring.Base {
    ref: FirebaseFirestore.DocumentReference;
    refPath: string;
    neoTask: NeoTask;
    static querySnapshot(refPath: string): Promise<FirebaseFirestore.QuerySnapshot>;
    static setFailure<T extends HasNeoTask>(model: T, neoTask: NeoTask): Promise<FirebaseFirestore.WriteResult[]>;
    static deleteFailure<T extends HasNeoTask>(model: T): Promise<void>;
}
export declare enum NeoTaskStatus {
    none = 0,
    success = 1,
    failure = 2,
}
export interface HasNeoTask extends Pring.Base {
    neoTask?: NeoTask;
}
export declare class NeoTask extends Pring.Base {
    status?: NeoTaskStatus;
    completed?: {
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
    static clearCompleted<T extends HasNeoTask>(model: T): Promise<T>;
    static isCompleted<T extends HasNeoTask>(model: T, step: string): boolean;
    static makeNeoTask<T extends HasNeoTask>(model: T): NeoTask;
    static setRetry<T extends HasNeoTask>(model: T, step: string, error: any): Promise<T>;
    static setInvalid<T extends HasNeoTask>(model: T, error: ValidationError): Promise<T>;
    static setFatal<T extends HasNeoTask>(model: T, step: string, error: any): Promise<T>;
    static getRetryCount<T extends HasNeoTask>(model: T): number | undefined;
    private static MAX_RETRY_COUNT;
    static shouldRetry<T extends HasNeoTask>(model: T, previoudModel?: T): boolean;
    static setFatalIfRetryCountIsMax<T extends HasNeoTask>(model: T, previoudModel?: T): Promise<void>;
    static setSuccess<T extends HasNeoTask>(model: T): Promise<T>;
}
