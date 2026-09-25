import type {
  ClinicianDecision,
  PlayerProfile,
  SyncItem,
  TestRecord,
} from "./types";

const DB_NAME = "comeback-data";
const DB_VERSION = 1;

type StoreName = "profiles" | "tests" | "decisions" | "syncQueue";
type StoredValue = PlayerProfile | TestRecord | ClinicianDecision | SyncItem;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("profiles")) {
        database.createObjectStore("profiles", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("tests")) {
        const store = database.createObjectStore("tests", { keyPath: "id" });
        store.createIndex("playerId", "playerId");
      }
      if (!database.objectStoreNames.contains("decisions")) {
        const store = database.createObjectStore("decisions", { keyPath: "id" });
        store.createIndex("playerId", "playerId");
      }
      if (!database.objectStoreNames.contains("syncQueue")) {
        database.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putValue(storeName: StoreName, value: StoredValue) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(value);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getValue<T>(storeName: StoreName, id: string) {
  const database = await openDatabase();
  const result = await requestResult(
    database.transaction(storeName).objectStore(storeName).get(id),
  );
  database.close();
  return result as T | undefined;
}

export async function getAllValues<T>(storeName: StoreName) {
  const database = await openDatabase();
  const result = await requestResult(
    database.transaction(storeName).objectStore(storeName).getAll(),
  );
  database.close();
  return result as T[];
}

export async function deleteValue(storeName: StoreName, id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(id);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function clearLocalData() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other ComeBack tabs before erasing data."));
  });
}

export async function saveWithQueue(
  entity: SyncItem["entity"],
  storeName: StoreName,
  value: StoredValue,
) {
  await putValue(storeName, value);
  const item: SyncItem = {
    id: `queue-${entity}-${value.id}`,
    entity,
    entityId: value.id,
    payload: value,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await putValue("syncQueue", item);
}
