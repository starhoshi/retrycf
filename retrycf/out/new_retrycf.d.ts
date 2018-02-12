import * as FirebaseFirestore from '@google-cloud/firestore';
/**
 * Initialize in your index.ts.
 * @param adminOptions functions.config().firebase
 * @param options maxRetryCount
 */
export declare const initialize: (adminOptions: any, options?: {
    maxRetryCount: number;
} | undefined) => void;
export declare enum Status {
    ShouldNotRetry = "ShouldRetry",
    ShouldRetry = "ShouldRetry",
    RetryFailed = "RetryFailed",
}
export interface IRetry {
    count: number;
    errors: {
        createdAt: Date;
        error: any;
    }[];
}
export declare const setRetry: (ref: FirebaseFirestore.DocumentReference, data: any, error: any) => Promise<IRetry>;
export declare const retryStatus: (data: any, previousData: any, maxRetryCount?: number) => Status;
export declare const clear: (ref: FirebaseFirestore.DocumentReference) => Promise<FirebaseFirestore.WriteResult>;
