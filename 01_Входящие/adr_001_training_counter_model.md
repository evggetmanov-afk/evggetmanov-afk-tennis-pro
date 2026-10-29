---
id: 20261028160000
case_id: 20261028120233
created: 2026-10-28 16:00:00
title: "ADR 001: Архитектурная модель детского тренировочного счетчика (iPadOS Web/PWA)"
status: accepted
tags:
  - adr
  - architecture
  - ipad
  - pwa
  - web_audio
  - canvas
---

# ADR 001: Архитектурная модель детского тренировочного счетчика

## 1. Контекст и статус
- **Статус:** Принято (Accepted)
- **Окружение:** Safari на iPad Pro (standalone PWA «На экран "Домой"»), раздача через GitHub Pages (HTTPS).
- **Сценарий:** Динамическая тренировка на спортивном корте. Дети на бегу касаются экрана для фиксации очков; тренер управляет таймером, проверяет спорные моменты и публикует итоги в каналы коммуникации.

---

## 2. Архитектурные принципы и инварианты

1. **Zero-Dependency Monolith:** Ровно один файл `index.html`. Внешние скрипты, шрифты, иконки и CSS-библиотеки запрещены.
2. **Offline-First & Local Persistence:** Полная автономность на корте. Все данные (база группы, аватарки, счетчики, история сессий) хранятся локально в `localStorage`.
3. **Audio-Synthesized UI:** Полный отказ от внешних звуковых файлов (`.mp3`/`.wav`). Все звуки (мяуканье, лай, лазер, свисток, клики) генерируются в реальном времени через встроенный `Web Audio API` (`OscillatorNode`, `BiquadFilterNode`, `GainNode`).
4. **iPadOS Input Optimization:** Обработка касаний исключительно через нативные события `touchstart` с вызовом `event.preventDefault()` для устранения 300ms tap delay и предотвращения системных зумов и скролла.

---

## 3. Модель данных (State Schema)

Состояние приложения структурировано в глобальный объект `AppState`, который синхронно зеркалируется в ключ `tc_app_state` в `localStorage`:

```javascript
const AppState = {
  version: "1.0.0",
  // База всех участников группы
  roster: [
    { id: "p1", name: "Лёва", avatar: "🐱", sound: "cat", color: "#FF6B6B" },
    { id: "p2", name: "Миша", avatar: "🚀", sound: "laser", color: "#4D96FF" },
    { id: "p3", name: "Артём", avatar: "🦁", sound: "roar", color: "#FFD93D" },
    { id: "p4", name: "София", avatar: "🐼", sound: "plop", color: "#6BCB77" }
  ],
  // Активный состав текущей серии (от 2 до 8 id)
  activePlayerIds: ["p1", "p2", "p3", "p4"],
  
  // Текущая игровая сессия
  session: {
    scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
    history: [], // Стек отката: [{ playerId, timestamp }]
    status: "idle", // "idle" | "running" | "finished"
    mode: {
      timerEnabled: true,
      durationSec: 180,
      targetScoreEnabled: false,
      targetScore: 12
    },
    timerRemaining: 180
  },

  // Настройки интеграций
  settings: {
    tgBotToken: "",
    tgChatId: "",
    debounceMs: 600
  }
};