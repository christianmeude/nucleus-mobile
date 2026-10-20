/**
 * In-memory AsyncStorage for unit tests.
 *
 * Jest auto-applies manual mocks for node modules from a root `__mocks__`
 * directory, so tests do not need a `jest.mock(...)` call.
 *
 * Deliberately plain functions, not `jest.fn()`: several API suites call
 * `jest.resetAllMocks()` in `beforeEach`, which wipes the implementations of
 * every Jest mock in the process — including the ones inside the mock shipped
 * with the package. That silently turned the store into no-ops and made cache
 * writes disappear. Assert on stored state (`getAllKeys`/`getItem`), not on
 * bridge call counts.
 */

let store = {};

const read = (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null);

const AsyncStorageMock = {
  getItem: async (key) => read(key),
  setItem: async (key, value) => {
    store[key] = String(value);
  },
  removeItem: async (key) => {
    delete store[key];
  },
  clear: async () => {
    store = {};
  },
  getAllKeys: async () => Object.keys(store),
  multiGet: async (keys) => keys.map((key) => [key, read(key)]),
  multiSet: async (pairs) => {
    pairs.forEach(([key, value]) => {
      store[key] = String(value);
    });
  },
  multiRemove: async (keys) => {
    keys.forEach((key) => {
      delete store[key];
    });
  },
  flushGetRequests: async () => {},
  useAsyncStorage: (key) => ({
    getItem: () => AsyncStorageMock.getItem(key),
    setItem: (value) => AsyncStorageMock.setItem(key, value),
    removeItem: () => AsyncStorageMock.removeItem(key),
  }),
};

module.exports = AsyncStorageMock;
