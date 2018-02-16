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
const admin = require("firebase-admin");
const Retrycf = require("../retrycf");
const Rescue = require("rescue-fire");
require("jest");
jest.setTimeout(20000);
beforeAll(() => {
    const serviceAccount = require('../../sandbox-329fc-firebase-adminsdk.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    Retrycf.initialize({
        projectId: 'sandbox-329fc',
        keyFilename: './sandbox-329fc-firebase-adminsdk.json'
    }, { maxRetryCount: 2 });
});
let user;
const data = { name: 'test' };
const error = Error('An error occured');
const defaultRetry = { count: 1, errors: [{ createdAt: new Date(), error: error.toString(), stack: 'line:1' }] };
beforeEach(() => __awaiter(this, void 0, void 0, function* () {
    user = yield admin.firestore().collection('retrycf-user').add(data);
}));
describe('setRetry', () => {
    describe('data not exist retry', () => {
        test('only 1 error', () => __awaiter(this, void 0, void 0, function* () {
            const event = Rescue.event(user, data);
            const retry = yield Retrycf.setRetry(event.data.ref, event.data.data(), error);
            expect(retry.count).toBe(1);
            expect(retry.errors.length).toBe(1);
            expect(retry.errors[0].createdAt).toBeDefined();
            expect(retry.errors[0].error).toBeDefined();
            expect(retry.errors[0].stack).toBeDefined();
            const updatedUser = yield admin.firestore().doc(user.path).get().then(s => s.data());
            expect(updatedUser.retry.count).toBe(1);
            expect(updatedUser.retry.errors.length).toBe(1);
            expect(updatedUser.retry.errors[0].createdAt).toBeDefined();
            expect(updatedUser.retry.errors[0].error).toBeDefined();
            expect(updatedUser.retry.errors[0].stack).toBeDefined();
        }));
    });
    describe('data already exist retry', () => {
        test('exist multiple error', () => __awaiter(this, void 0, void 0, function* () {
            yield user.update({ retry: defaultRetry });
            const event = Rescue.event(user, { name: 'test', retry: defaultRetry });
            const retry = yield Retrycf.setRetry(event.data.ref, event.data.data(), error);
            expect(retry.count).toBe(2);
            expect(retry.errors.length).toBe(2);
            expect(retry.errors[0].createdAt).toBeDefined();
            expect(retry.errors[0].error).toBe(defaultRetry.errors[0].error);
            expect(retry.errors[0].stack).toBeDefined();
            expect(retry.errors[1].createdAt).toBeDefined();
            expect(retry.errors[1].error).toBeDefined();
            expect(retry.errors[1].stack).toBeDefined();
            const updatedUser = yield admin.firestore().doc(user.path).get().then(s => s.data());
            expect(updatedUser.retry.count).toBe(2);
            expect(updatedUser.retry.errors.length).toBe(2);
            expect(updatedUser.retry.errors[0].createdAt).toBeDefined();
            expect(updatedUser.retry.errors[0].error).toBe(defaultRetry.errors[0].error);
            expect(updatedUser.retry.errors[0].stack).toBeDefined();
            expect(updatedUser.retry.errors[1].createdAt).toBeDefined();
            expect(updatedUser.retry.errors[1].error).toBeDefined();
            expect(updatedUser.retry.errors[1].stack).toBeDefined();
        }));
    });
    describe('data.retry exist, but not exist count', () => {
        test('only 1 error', () => __awaiter(this, void 0, void 0, function* () {
            yield user.update({ retry: {} });
            const event = Rescue.event(user, { name: 'test', retry: {} });
            const retry = yield Retrycf.setRetry(event.data.ref, event.data.data(), error);
            expect(retry.count).toBe(1);
            expect(retry.errors.length).toBe(1);
            expect(retry.errors[0].createdAt).toBeDefined();
            expect(retry.errors[0].error).toBeDefined();
            expect(retry.errors[0].stack).toBeDefined();
            const updatedUser = yield admin.firestore().doc(user.path).get().then(s => s.data());
            expect(updatedUser.retry.count).toBe(1);
            expect(updatedUser.retry.errors.length).toBe(1);
            expect(updatedUser.retry.errors[0].createdAt).toBeDefined();
            expect(updatedUser.retry.errors[0].error).toBeDefined();
            expect(updatedUser.retry.errors[0].stack).toBeDefined();
        }));
    });
});
describe('retryStatus', () => {
    describe('data.retry.count is undefined', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = undefined;
            const previousData = undefined;
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data.retry.count is 1, previous is undefined', () => {
        test('Status.ShouldRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: { count: 1 } };
            const previousData = undefined;
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldRetry);
        }));
    });
    describe('data.retry.count is 1, previous is 1', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: { count: 1 } };
            const previousData = { retry: { count: 1 } };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data.retry.count is 3, previous is 2', () => {
        test('Status.RetryFailed', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: { count: 3 } };
            const previousData = { retry: { count: 2 } };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.RetryFailed);
        }));
    });
    describe('data.retry.count is 2, previous is 3', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: { count: 2 } };
            const previousData = { retry: { count: 3 } };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data exist, but retry undefined', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = {};
            const previousData = {};
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data.retry undefined', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: undefined };
            const previousData = { retry: undefined };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data.retry.count undefined', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: { count: undefined } };
            const previousData = { retry: { counst: undefined } };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('data.retry exist, but data.retry.count is undefined', () => {
        test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
            const currentData = { retry: {} };
            const previousData = { retry: {} };
            const retryStatus = Retrycf.retryStatus(currentData, previousData);
            expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
        }));
    });
    describe('change maxRetryCount to 3', () => {
        describe('data.retry.count is 3, previous is 2', () => {
            test('Status.ShouldRetry', () => __awaiter(this, void 0, void 0, function* () {
                const currentData = { retry: { count: 3 } };
                const previousData = { retry: { count: 2 } };
                const retryStatus = Retrycf.retryStatus(currentData, previousData, 3);
                expect(retryStatus).toBe(Retrycf.Status.ShouldRetry);
            }));
        });
        describe('data.retry.count is 3, previous is 1', () => {
            test('Status.ShouldNotRetry', () => __awaiter(this, void 0, void 0, function* () {
                const currentData = { retry: { count: 3 } };
                const previousData = { retry: { count: 1 } };
                const retryStatus = Retrycf.retryStatus(currentData, previousData, 3);
                expect(retryStatus).toBe(Retrycf.Status.ShouldNotRetry);
            }));
        });
    });
});
describe('clear', () => {
    test('update to {}', () => __awaiter(this, void 0, void 0, function* () {
        // prepare
        const event = Rescue.event(user, data);
        yield Retrycf.setRetry(event.data.ref, event.data.data(), error);
        let updatedUser = yield admin.firestore().doc(user.path).get().then(s => s.data());
        expect(updatedUser.retry.count).toBe(1);
        // clear
        const retry = yield Retrycf.clear(user);
        // expect
        expect(retry).toEqual({});
        updatedUser = yield admin.firestore().doc(user.path).get().then(s => s.data());
        expect(updatedUser.retry).toEqual({});
    }));
});
