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
const admin = require("firebase-admin");
const pring_1 = require("pring");
class Failure extends pring_1.Pring.Base {
    static querySnapshot(refPath) {
        return admin.firestore().collection('version/1/failure')
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
exports.Failure = Failure;
