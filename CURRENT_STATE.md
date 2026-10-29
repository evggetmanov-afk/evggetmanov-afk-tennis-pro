# Текущий статус проекта (CURRENT_STATE)

## Актуальный фокус
- **Текущий этап:** Фаза 1 (Базовый тренировочный контур) — переход к Модулю 4.
- **Активный модуль:** Модуль 4 (Секундомер со штрафами) / `src/js/modules/timer.js`.
- **Активная спецификация:** `docs/roadmap.md`.
- **Регламент сохранения кода:** `docs/specs/spec_save_workflow.md`.

---

## Временные технические договоренности
- Строгая изоляция: разработка ведется по правилу «Один шаг за раз».
- Хранение сессий: состав активной тренировки хранится в `localStorage`, архив завершенных раундов — в IndexedDB.
- Все сенсорные элементы используют `pointerdown` и `touch-action: manipulation` для исключения задержек Safari.
- Звуки свистка, штрафов и очков синтезируются на лету через `soundEngine` (Web Audio API).

---

## Задачи текущей сессии
- [x] Реструктуризация кодовой базы и изоляция каталога `inbox/`.
- [x] Фиксация регламента сохранения в `docs/specs/spec_save_workflow.md`.
- [x] Фиксация пула модулей и этапов в `docs/roadmap.md`.
- [x] Аудит и адаптация `src/js/core/storage.js` (IndexedDB + localStorage, бэкап).
- [x] Аудит и адаптация `src/js/core/audio.js` (Web Audio Lifecycle, Safari interrupted, очистка нод).
- [x] Реализация Модуля 1 (`src/js/modules/roster.js`): чекин, профили, экспорт базы.
- [x] Стилизация экрана ростера под iPad (`src/css/components/roster.css`).
- [x] Аудит и адаптация Модуля 2 (`src/js/modules/counter.js`): throttle 110 мс, подсчет касаний.
- [x] Стилизация табло касаний (`src/css/components/counter.css`).
- [x] Настройка сборщика `scripts/build.py` и успешная компиляция дистрибутива `index.html`.
- [ ] Проектирование и реализация Модуля 4: Секундомер со штрафами (`src/js/modules/timer.js`).
- [ ] Стилизация секундомера под iPad (`src/css/components/timer.css`).
- [ ] Включение Модуля 4 в сборщик `scripts/build.py`.