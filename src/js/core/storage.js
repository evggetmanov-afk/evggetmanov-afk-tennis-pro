// Двухуровневое хранилище (IndexedDB + localStorage) по стандарту Tennis Pro
// IndexedDB: постоянный ростер, профили, фото, архив тренировок
// localStorage: оперативный кэш активной сессии на корте

const DB_NAME = "tennis_pro_db";
const DB_VERSION = 1;

const STORES = {
    ROSTER: "roster",
    HISTORY: "history"
};

const CACHE_KEYS = {
    ACTIVE_SESSION: "tennis_active_session_v1"
};

const DEFAULT_ROSTER = [
    { id: "p_1", name: "Миша", color: "#3b82f6", sound: "laser", photo: null, createdAt: Date.now() },
    { id: "p_2", name: "Саша", color: "#ef4444", sound: "coin", photo: null, createdAt: Date.now() },
    { id: "p_3", name: "Лев", color: "#10b981", sound: "spring", photo: null, createdAt: Date.now() },
    { id: "p_4", name: "Соня", color: "#f59e0b", sound: "default", photo: null, createdAt: Date.now() },
    { id: "p_5", name: "Тимофей", color: "#8b5cf6", sound: "laser", photo: null, createdAt: Date.now() },
    { id: "p_6", name: "Артём", color: "#ec4899", sound: "coin", photo: null, createdAt: Date.now() },
    { id: "p_7", name: "Даша", color: "#06b6d4", sound: "spring", photo: null, createdAt: Date.now() },
    { id: "p_8", name: "Марк", color: "#84cc16", sound: "default", photo: null, createdAt: Date.now() }
];

let dbInstance = null;

// Инициализация IndexedDB с миграцией схемы
function openDatabase() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORES.ROSTER)) {
                db.createObjectStore(STORES.ROSTER, { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: "id" });
                historyStore.createIndex("timestamp", "timestamp", { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error("IndexedDB Open Error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Универсальный хелпер транзакций
async function executeTransaction(storeName, mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);

        let result = null;
        try {
            result = callback(store);
        } catch (err) {
            reject(err);
            return;
        }

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

export const storage = {
    // ------------------------------------------------------------------------
    // 1. Уровень IndexedDB (Ростер участников)
    // ------------------------------------------------------------------------

    // Получить полный ростер. При первом запуске заполняет базу DEFAULT_ROSTER
    async getRoster() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.ROSTER], "readonly");
            const store = tx.objectStore(STORES.ROSTER);
            const request = store.getAll();

            request.onsuccess = async () => {
                const roster = request.result;
                if (!roster || roster.length === 0) {
                    await this.initDefaultRoster();
                    resolve(DEFAULT_ROSTER);
                } else {
                    resolve(roster);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Первичная инициализация дефолтного ростера
    async initDefaultRoster() {
        return executeTransaction(STORES.ROSTER, "readwrite", (store) => {
            DEFAULT_ROSTER.forEach((athlete) => store.put(athlete));
        });
    },

    // Добавить или обновить спортсмена
    async saveAthlete(athlete) {
        if (!athlete.id) {
            athlete.id = "p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        }
        if (!athlete.updatedAt) {
            athlete.updatedAt = Date.now();
        }
        await executeTransaction(STORES.ROSTER, "readwrite", (store) => {
            store.put(athlete);
        });
        return athlete;
    },

    // Удалить спортсмена по id
    async deleteAthlete(id) {
        return executeTransaction(STORES.ROSTER, "readwrite", (store) => {
            store.delete(id);
        });
    },

    // ------------------------------------------------------------------------
    // 2. Уровень IndexedDB (Архив тренировочных сессий)
    // ------------------------------------------------------------------------

    // Сохранить завершенную сессию в постоянный архив
    async archiveSession(sessionSummary) {
        if (!sessionSummary.id) {
            sessionSummary.id = "sess_" + Date.now();
        }
        sessionSummary.timestamp = sessionSummary.timestamp || Date.now();

        await executeTransaction(STORES.HISTORY, "readwrite", (store) => {
            store.put(sessionSummary);
        });
        return sessionSummary;
    },

    // Получить архив всех завершенных сессий
    async getHistory() {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.HISTORY], "readonly");
            const store = tx.objectStore(STORES.HISTORY);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    // ------------------------------------------------------------------------
    // 3. Уровень localStorage (Быстрый кэш активной сессии на корте)
    // ------------------------------------------------------------------------

    // Получить активное состояние текущей тренировки
    getActiveSession() {
        try {
            const raw = localStorage.getItem(CACHE_KEYS.ACTIVE_SESSION);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("Ошибка чтения активной сессии из localStorage:", e);
            return null;
        }
    },

    // Сохранить текущее состояние активной тренировки (чекин, таймер, счета)
    saveActiveSession(sessionState) {
        try {
            localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(sessionState));
        } catch (e) {
            console.error("Ошибка сохранения активной сессии в localStorage:", e);
        }
    },

    // Сбросить активную сессию (после завершения тренировки)
    clearActiveSession() {
        try {
            localStorage.removeItem(CACHE_KEYS.ACTIVE_SESSION);
        } catch (e) {
            console.error("Ошибка очистки активной сессии:", e);
        }
    },

    // ------------------------------------------------------------------------
    // 4. Защита от стирания данных Safari / Резервный экспорт и импорт
    // ------------------------------------------------------------------------

    // Формирование полного снимка базы данных в JSON
    async createBackupSnapshot() {
        const roster = await this.getRoster();
        const history = await this.getHistory();
        const activeSession = this.getActiveSession();

        return {
            app: "Tennis Pro",
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            data: {
                roster,
                history,
                activeSession
            }
        };
    },

    // Скачивание резервного файла на iPad/Mac
    async downloadBackupFile() {
        const snapshot = await this.createBackupSnapshot();
        const jsonStr = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tennis_pro_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Восстановление базы данных из JSON-объекта
    async restoreFromBackup(snapshot) {
        if (!snapshot || !snapshot.data || !Array.isArray(snapshot.data.roster)) {
            throw new Error("Неверная структура файла резервной копии.");
        }

        // Восстановление ростера
        await executeTransaction(STORES.ROSTER, "readwrite", (store) => {
            store.clear();
            snapshot.data.roster.forEach((athlete) => store.put(athlete));
        });

        // Восстановление истории (если есть)
        if (Array.isArray(snapshot.data.history)) {
            await executeTransaction(STORES.HISTORY, "readwrite", (store) => {
                store.clear();
                snapshot.data.history.forEach((record) => store.put(record));
            });
        }

        // Восстановление активной сессии
        if (snapshot.data.activeSession) {
            this.saveActiveSession(snapshot.data.activeSession);
        } else {
            this.clearActiveSession();
        }

        return true;
    }
};