"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FirebaseFirestore = require("@google-cloud/firestore");
let _firestore;
let _maxRetryCount = 2;
/**
 * Initialize in your index.ts.
 * @param adminOptions functions.config().firebase
 * @param options maxRetryCount
 */
exports.initialize = (adminOptions, options) => {
    _firestore = new FirebaseFirestore.Firestore(adminOptions);
    if (options) {
        _maxRetryCount = options.maxRetryCount;
    }
};
var Status;
(function (Status) {
    Status["ShouldNotRetry"] = "ShouldRetry";
    Status["ShouldRetry"] = "ShouldRetry";
    Status["RetryFailed"] = "RetryFailed";
})(Status = exports.Status || (exports.Status = {}));
const makeRetry = (data, error) => {
    const currentError = { createdAt: new Date(), error: error };
    let retry = { count: 0, errors: new Array() };
    if (data.retry && data.retry.count) {
        retry = data.retry;
    }
    retry.count += 1;
    retry.errors.push(currentError);
    return retry;
};
exports.setRetry = (ref, data, error) => __awaiter(this, void 0, void 0, function* () {
    const retry = makeRetry(data, error);
    yield ref.update({ retry: retry });
    return retry;
});
const getRetryCount = (data) => {
    if (!data) {
        return undefined;
    }
    if (!data.retry) {
        return undefined;
    }
    if (!data.retry.count) {
        return undefined;
    }
    return data.retry.count;
};
exports.retryStatus = (data, previousData, maxRetryCount = _maxRetryCount) => {
    const currentCount = getRetryCount(data);
    const previousCount = getRetryCount(previousData);
    if (!currentCount) {
        return Status.ShouldNotRetry;
    }
    // Not retry more than max times
    // For example: currentCount(3) > maxRetryCount(2)
    if (currentCount > maxRetryCount) {
        return Status.RetryFailed;
    }
    // Current neoTask.retry exists, but previous neoTask.retry does not exist
    // For example: currentCount(1), previousCount(undfined)
    if (!previousCount) {
        return Status.ShouldRetry;
    }
    // Returns true if the current retry count has increased from the previous retry count.
    // For example:
    //      true: currentCount(2), previousCount(1)
    //      false: currentCount(2), previousCount(2)
    if (currentCount > previousCount) {
        return Status.ShouldRetry;
    }
    return Status.ShouldNotRetry;
};
exports.clear = (ref) => {
    return ref.update({ retry: {} });
};
