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
const failure_1 = require("./failure");
var NeoTaskStatus;
(function (NeoTaskStatus) {
    NeoTaskStatus[NeoTaskStatus["none"] = 0] = "none";
    NeoTaskStatus[NeoTaskStatus["success"] = 1] = "success";
    NeoTaskStatus[NeoTaskStatus["failure"] = 2] = "failure";
})(NeoTaskStatus = exports.NeoTaskStatus || (exports.NeoTaskStatus = {}));
class NeoTask {
    constructor(deltaDocumentSnapshot) {
        this.status = NeoTaskStatus.failure;
        const neoTask = deltaDocumentSnapshot.data().neoTask;
        if (neoTask) {
            if (neoTask.invalid) {
                this.invalid = neoTask.invalid;
            }
            if (neoTask.retry) {
                this.retry = neoTask.retry;
            }
            if (neoTask.fatal) {
                this.fatal = neoTask.fatal;
            }
        }
    }
    static setRetry(event, step, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoTask = new NeoTask(event.data);
            if (!neoTask.retry) {
                neoTask.retry = { error: new Array(), count: 0 };
            }
            neoTask.status = NeoTaskStatus.failure;
            neoTask.retry.error.push(error.toString());
            neoTask.retry.count += 1; // これをトリガーにして再実行する
            yield event.data.ref.update({ neoTask: neoTask.rawValue() });
            yield failure_1.Failure.setFailure(event.data, neoTask.rawValue());
            return neoTask;
        });
    }
    static setInvalid(event, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoTask = new NeoTask(event.data);
            neoTask.invalid = {
                validationError: error.validationErrorType,
                reason: error.reason
            };
            yield event.data.ref.update({ neoTask: neoTask.rawValue() });
            return neoTask;
        });
    }
    static setFatal(event, step, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoTask = new NeoTask(event.data);
            neoTask.fatal = {
                step: step,
                error: error.toString()
            };
            console.error('fatal_error', event.data.ref.id);
            yield event.data.ref.update({ neoTask: neoTask.rawValue() });
            yield failure_1.Failure.setFailure(event.data, neoTask.rawValue());
            return neoTask;
        });
    }
    static getRetryCount(data) {
        const snapshotData = data.data();
        const currentNeoTask = snapshotData && snapshotData.neoTask;
        if (!(currentNeoTask && currentNeoTask.retry && currentNeoTask.retry.count)) {
            return undefined;
        }
        return currentNeoTask.retry.count;
    }
    static shouldRetry(data) {
        const currentRetryCount = NeoTask.getRetryCount(data);
        const previousRetryCount = data.previous && NeoTask.getRetryCount(data.previous);
        if (!currentRetryCount) {
            return false;
        }
        // リトライカウントが3回以上だったら retry しない
        if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT) {
            return false;
        }
        // リトライカウントがあるけど previous にはない
        if (!previousRetryCount) {
            return true; // 新しく retry が生成されたということになるので true
        }
        // retry count が前回から変更されていたら retry する
        return currentRetryCount > previousRetryCount;
    }
    static setFatalIfRetryCountIsMax(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentRetryCount = NeoTask.getRetryCount(event.data);
            const previousRetryCount = event.data.previous && NeoTask.getRetryCount(event.data.previous);
            if (currentRetryCount && previousRetryCount) {
                if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT && currentRetryCount > previousRetryCount) {
                    return NeoTask.setFatal(event, 'retry_failed', 'retry failed');
                }
            }
        });
    }
    static success(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const neoTask = { status: NeoTaskStatus.success };
            console.log('success', neoTask);
            yield event.data.ref.update({ neoTask: neoTask });
            console.log('success updated');
            yield failure_1.Failure.deleteFailure(event.data.ref);
            console.log('delete failured');
        });
    }
    rawValue() {
        const neoTask = { status: this.status };
        if (this.invalid) {
            neoTask.invalid = this.invalid;
        }
        if (this.retry) {
            neoTask.retry = this.retry;
        }
        if (this.fatal) {
            neoTask.fatal = this.fatal;
        }
        return neoTask;
    }
}
NeoTask.MAX_RETRY_COUNT = 3;
exports.NeoTask = NeoTask;
class ValidationError extends Error {
    constructor(validationErrorType, reason) {
        super();
        this.validationErrorType = validationErrorType;
        this.reason = reason;
    }
}
exports.ValidationError = ValidationError;
