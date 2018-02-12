import * as FirebaseFirestore from '@google-cloud/firestore';
/**
 * Initialize in your index.ts.
 * @param adminOptions functions.config().firebase
 * @param options maxRetryCount
 */
export declare const initialize: (adminOptions: any, options?: {
    maxRetryCount: number;
} | undefined) => void;
/**
 * Retrycf.Status
 */
export declare enum Status {
    /** should not retry */
    ShouldNotRetry = "ShouldRetry",
    /** should retry */
    ShouldRetry = "ShouldRetry",
    /** retry failed */
    RetryFailed = "RetryFailed",
}
/**
 * Parameters to be saved by setRetry()
 */
export interface IRetry {
    /** retry count */
    count: number;
    /** Record retry reason */
    errors: {
        createdAt: Date;
        error: any;
    }[];
}
/**
 * save retry parameters.
 * @param ref event.data.ref
 * @param data event.data.data()
 * @param error Error
 */
export declare const setRetry: (ref: FirebaseFirestore.DocumentReference, data: any, error: any) => Promise<IRetry>;
/**
 * If retry.count is increasing from previousData, it returns ShouldRetry.
 * If retry.count is increased from previousData and it exceeds max retry count, RetryFailed is returned.
 * @param data event.data.data()
 * @param previousData event.data.previous.data()
 * @param maxRetryCount optional. If you change maxRetryCount, set number.
 */
export declare const retryStatus: (data: any, previousData: any, maxRetryCount?: number) => Status;
/**
 * update retry to {}.
 * @param ref event.data.ref
 */
export declare const clear: (ref: FirebaseFirestore.DocumentReference) => Promise<{}>;
