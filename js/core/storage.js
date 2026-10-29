// Модуль локального хранилища (localStorage) по стандарту ADR-002

const STORAGE_KEYS = {
    ROSTER: "tennis_roster_v1",
    SESSION: "tennis_active_session_v1"
};

// 8 начальных профилей участников по умолчанию
const DEFAULT_ROSTER = [
    { id: "p_1", name: "Миша", color: "#3b82f6", sound: "laser" },
    { id: "p_2", name: "Саша", color: "#ef4444", sound: "coin" },
    { id: "p_3", name: "Лев", color: "#10b981", sound: "spring" },
    { id: "p_4", name: "Соня", color: "#f59e0b", sound: "default" },
    { id: "p_5", name: "Тимофей", color: "#8b5cf6", sound: "laser" },
    { id: "p_6", name: "Артём", color: "#ec4899", sound: "coin" },
    { id: "p_7", name: "Даша", color: "#06b6d4", sound: "spring" },
    { id: "p_8", name: "Марк", color: "#84cc16", sound: "default" }
];

export const storage = {
    // Получить список всех учеников
    getRoster() {
        const data = localStorage.getItem(STORAGE_KEYS.ROSTER);
        if (!data) {
            this.saveRoster(DEFAULT_ROSTER);
            return DEFAULT_ROSTER;
        }
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Ошибка чтения ростера:", e);
            return DEFAULT_ROSTER;
        }
    },

    // Сохранить список всех учеников
    saveRoster(roster) {
        localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(roster));
    },

    // Получить активную сессию дня
    getSession() {
        const data = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Ошибка чтения сессии:", e);
            return null;
        }
    },

    // Сохранить состояние сессии
    saveSession(session) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    },

    // Экспорт базы в JSON-строку
    exportBackup() {
        return JSON.stringify({
            roster: this.getRoster(),
            session: this.getSession(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    }
};
