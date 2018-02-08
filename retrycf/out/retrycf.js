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
function initialize(options) {
    firestore = new FirebaseFirestore.Firestore(options);
    pring_1.Pring.initialize(options);
}
exports.initialize = initialize;
class CompletedError extends Error {
    constructor(step) {
        super();
        this.step = step;
    }
}
exports.CompletedError = CompletedError;
class ValidationError extends Error {
    constructor(validationErrorType, reason) {
        super();
        this.validationErrorType = validationErrorType;
        this.reason = reason;
    }
}
exports.ValidationError = ValidationError;
class Failure extends pring_1.Pring.Base {
    static querySnapshot(refPath) {
        return firestore.collection('version/1/failure')
            .where('refPath', '==', refPath)
            .get();
    }
    static setFailure(model, neoTask) {
        return __awaiter(this, void 0, void 0, function* () {
            const querySnapshot = yield Failure.querySnapshot(model.reference.path);
            if (querySnapshot.docs.length === 0) {
                const failure = new Failure();
                // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
                // failure.ref = documentSnapshot.ref
                failure.refPath = model.reference.path;
                failure.neoTask = neoTask.rawValue();
                return failure.save();
            }
            else {
                const failure = new Failure();
                failure.init(querySnapshot.docs[0]);
                // FIXME: ref を保存しようとすると Error: Cannot encode type ([object Object]) のエラーが出る
                // failure.ref = documentSnapshot.ref
                failure.refPath = model.reference.path;
                failure.neoTask = neoTask.rawValue();
                return failure.update();
            }
        });
    }
    static deleteFailure(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const querySnapshot = yield Failure.querySnapshot(model.reference.path);
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
exports.Failure = Failure;
var NeoTaskStatus;
(function (NeoTaskStatus) {
    NeoTaskStatus[NeoTaskStatus["none"] = 0] = "none";
    NeoTaskStatus[NeoTaskStatus["success"] = 1] = "success";
    NeoTaskStatus[NeoTaskStatus["failure"] = 2] = "failure";
})(NeoTaskStatus = exports.NeoTaskStatus || (exports.NeoTaskStatus = {}));
class NeoTask extends pring_1.Pring.Base {
    static clearCompleted(model) {
        return __awaiter(this, void 0, void 0, function* () {
            let neoTask = NeoTask.makeNeoTask(model);
            delete neoTask.completed;
            model.neoTask = neoTask.rawValue();
            yield model.reference.update({ neoTask: neoTask.rawValue() });
            return model;
        });
    }
    static isCompleted(model, step) {
        if (!model.neoTask) {
            return false;
        }
        if (!model.neoTask.completed) {
            return false;
        }
        return !!model.neoTask.completed[step];
    }
    static makeNeoTask(model) {
        let neoTask = new NeoTask();
        if (model.neoTask) {
            if (model.neoTask.status) {
                neoTask.status = model.neoTask.status;
            }
            if (model.neoTask.completed) {
                neoTask.completed = model.neoTask.completed;
            }
            if (model.neoTask.invalid) {
                neoTask.invalid = model.neoTask.invalid;
            }
            if (model.neoTask.retry) {
                neoTask.retry = model.neoTask.retry;
            }
            if (model.neoTask.fatal) {
                neoTask.fatal = model.neoTask.fatal;
            }
        }
        return neoTask;
    }
    static setRetry(model, step, error) {
        return __awaiter(this, void 0, void 0, function* () {
            let neoTask = NeoTask.makeNeoTask(model);
            if (!neoTask.retry) {
                neoTask.retry = { error: new Array(), count: 0 };
            }
            neoTask.status = NeoTaskStatus.failure;
            neoTask.retry.error.push(error.toString());
            neoTask.retry.count += 1; // これをトリガーにして再実行する
            yield model.reference.update({ neoTask: neoTask.rawValue() });
            yield Failure.setFailure(model, neoTask);
            model.neoTask = neoTask.rawValue();
            return model;
        });
    }
    static setInvalid(model, error) {
        return __awaiter(this, void 0, void 0, function* () {
            let neoTask = NeoTask.makeNeoTask(model);
            neoTask.status = NeoTaskStatus.failure;
            neoTask.invalid = {
                validationError: error.validationErrorType,
                reason: error.reason
            };
            yield model.reference.update({ neoTask: neoTask.rawValue() });
            model.neoTask = neoTask.rawValue();
            return model;
        });
    }
    static setFatal(model, step, error) {
        return __awaiter(this, void 0, void 0, function* () {
            let neoTask = NeoTask.makeNeoTask(model);
            neoTask.status = NeoTaskStatus.failure;
            neoTask.fatal = {
                step: step,
                error: error.toString()
            };
            yield model.reference.update({ neoTask: neoTask.rawValue() });
            yield Failure.setFailure(model, neoTask);
            model.neoTask = neoTask.rawValue();
            return model;
        });
    }
    static getRetryCount(model) {
        let neoTask = NeoTask.makeNeoTask(model);
        if (!neoTask.retry) {
            return undefined;
        }
        return neoTask.retry.count;
    }
    static shouldRetry(model, previoudModel) {
        const currentRetryCount = NeoTask.getRetryCount(model);
        const previousRetryCount = previoudModel && NeoTask.getRetryCount(previoudModel);
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
    static setFatalIfRetryCountIsMax(model, previoudModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentRetryCount = NeoTask.getRetryCount(model);
            const previousRetryCount = previoudModel && NeoTask.getRetryCount(previoudModel);
            if (currentRetryCount && previousRetryCount) {
                if (currentRetryCount >= NeoTask.MAX_RETRY_COUNT && currentRetryCount > previousRetryCount) {
                    model = yield NeoTask.setFatal(model, 'retry_failed', 'retry failed');
                }
            }
            return model;
        });
    }
    static setSuccess(model) {
        return __awaiter(this, void 0, void 0, function* () {
            let neoTask = new NeoTask();
            neoTask.status = NeoTaskStatus.success;
            if (model.neoTask && model.neoTask.completed) {
                neoTask.completed = model.neoTask.completed;
            }
            yield model.reference.update({ neoTask: neoTask.rawValue() });
            yield Failure.deleteFailure(model);
            model.neoTask = neoTask.rawValue();
            return model;
        });
    }
}
NeoTask.MAX_RETRY_COUNT = 3;
__decorate([
    pring_1.property
], NeoTask.prototype, "status", void 0);
__decorate([
    pring_1.property
], NeoTask.prototype, "completed", void 0);
__decorate([
    pring_1.property
], NeoTask.prototype, "invalid", void 0);
__decorate([
    pring_1.property
], NeoTask.prototype, "retry", void 0);
__decorate([
    pring_1.property
], NeoTask.prototype, "fatal", void 0);
exports.NeoTask = NeoTask;
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
