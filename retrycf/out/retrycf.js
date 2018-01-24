"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const pring_1 = require("pring");
var firestore;
var Retrycf;
(function (Retrycf) {
    function initialize(options) {
        firestore = new FirebaseFirestore.Firestore(options);
        pring_1.Pring.initialize(options);
    }
    Retrycf.initialize = initialize;
    class Failure extends pring_1.Pring.Base {
        static querySnapshot(refPath) {
            return firestore.collection('version/1/failure')
                .where('refPath', '==', refPath)
                .get();
        }
        static setFailure(documentSnapshot, neoTask) {
            return __awaiter(this, void 0, void 0, function* () {
                const querySnapshot = yield Failure.querySnapshot(documentSnapshot.ref.path);
                if (querySnapshot.docs.length === 0) {
                    const failure = new Failure();
                    // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
                    // failure.ref = documentSnapshot.ref
                    failure.refPath = documentSnapshot.ref.path;
                    failure.neoTask = neoTask;
                    return failure.save();
                }
                else {
                    const failure = new Failure();
                    failure.init(querySnapshot.docs[0]);
                    // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
                    // failure.ref = documentSnapshot.ref
                    failure.refPath = documentSnapshot.ref.path;
                    failure.neoTask = neoTask;
                    return failure.update();
                }
            });
        }
        static deleteFailure(ref) {
            return __awaiter(this, void 0, void 0, function* () {
                const querySnapshot = yield Failure.querySnapshot(ref.path);
                for (const doc of querySnapshot.docs) {
                    const failure = new Failure();
                    failure.init(doc);
                    yield failure.delete();
                }
            });
        }
    }
    __decorate([
        pring_1.property
    ], Failure.prototype, "ref", void 0);
    __decorate([
        pring_1.property
    ], Failure.prototype, "refPath", void 0);
    __decorate([
        pring_1.property
    ], Failure.prototype, "neoTask", void 0);
    Retrycf.Failure = Failure;
    let NeoTaskStatus;
    (function (NeoTaskStatus) {
        NeoTaskStatus[NeoTaskStatus["none"] = 0] = "none";
        NeoTaskStatus[NeoTaskStatus["success"] = 1] = "success";
        NeoTaskStatus[NeoTaskStatus["failure"] = 2] = "failure";
    })(NeoTaskStatus = Retrycf.NeoTaskStatus || (Retrycf.NeoTaskStatus = {}));
    class NeoTask {
        constructor(deltaDocumentSnapshot) {
            this.status = NeoTaskStatus.none;
            this.completed = {};
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
        static markComplete(event, transaction, step) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log('ref', event.data.ref);
                return transaction.get(event.data.ref).then(tref => {
                    if (NeoTask.isCompleted(event, step)) {
                        throw 'duplicated';
                    }
                    else {
                        const neoTask = new NeoTask(event.data);
                        neoTask.completed[step] = true;
                        console.log('will save data', event.data.data());
                        transaction.update(event.data.ref, { flag: true });
                        console.log('saved data', event.data.data());
                    }
                });
            });
        }
        static isCompleted(event, step) {
            return __awaiter(this, void 0, void 0, function* () {
                const neoTask = new NeoTask(event.data);
                console.log(!!neoTask.completed[step]);
                return !!neoTask.completed[step];
            });
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
                yield Failure.setFailure(event.data, neoTask.rawValue());
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
                console.log('fatal_error', event.data.ref.id);
                yield event.data.ref.update({ neoTask: neoTask.rawValue() });
                yield Failure.setFailure(event.data, neoTask.rawValue());
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
                const neoTask = { status: NeoTaskStatus.success, completed: {} };
                yield event.data.ref.update({ neoTask: neoTask });
                yield Failure.deleteFailure(event.data.ref);
            });
        }
        rawValue() {
            const neoTask = { status: this.status, completed: {} };
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
    Retrycf.NeoTask = NeoTask;
    class ValidationError extends Error {
        constructor(validationErrorType, reason) {
            super();
            this.validationErrorType = validationErrorType;
            this.reason = reason;
        }
    }
    Retrycf.ValidationError = ValidationError;
})(Retrycf = exports.Retrycf || (exports.Retrycf = {}));
