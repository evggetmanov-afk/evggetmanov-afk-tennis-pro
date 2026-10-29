// Модуль 2: Табло касаний (Matrix Counter) по стандарту Tennis Pro
// Мультикасание, аппаратный throttle (100–120 мс) по pointerId, звуковой отклик

import { storage } from "../core/storage.js";
import { soundEngine } from "../core/audio.js";

export class MatrixCounterModule {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.onBackToRoster = options.onBackToRoster || null;

        this.participants = [];
        this.scores = new Map(); // id -> score
        this.lastPointerTouchTime = new Map(); // pointerId -> timestamp (Throttle)
        this.throttleMs = 110; // Аппаратное окно отсечения дребезга тача iPad

        this.init(options.participants);
    }

    init(explicitParticipants) {
        if (Array.isArray(explicitParticipants) && explicitParticipants.length >= 2) {
            this.participants = explicitParticipants;
        } else {
            const activeSession = storage.getActiveSession();
            if (activeSession && Array.isArray(activeSession.participants) && activeSession.participants.length >= 2) {
                this.participants = activeSession.participants;
            } else {
                // Если сессия не была задана, берем участников по умолчанию
                this.participants = [
                    { id: "p_1", name: "Миша", color: "#3b82f6", sound: "laser" },
                    { id: "p_2", name: "Саша", color: "#ef4444", sound: "coin" }
                ];
            }
        }

        // Инициализируем стартовые очки (0)
        this.participants.forEach((p) => {
            this.scores.set(p.id, 0);
        });

        this.render();
    }

    // Обработка очка с защитой от аппаратного дребезга (Throttle)
    handleTap(playerId, delta, pointerId, cardElement) {
        const now = performance.now();
        const lastTime = this.lastPointerTouchTime.get(pointerId) || 0;

        // Если повторный тап по этому pointerId пришел быстрее лимита — отсекаем
        if (delta > 0 && now - lastTime < this.throttleMs) {
            return;
        }
        this.lastPointerTouchTime.set(pointerId, now);

        const currentScore = this.scores.get(playerId) || 0;
        const newScore = Math.max(0, currentScore + delta);
        this.scores.set(playerId, newScore);

        // Обновляем табло
        const scoreEl = cardElement.querySelector(".score-value");
        if (scoreEl) {
            scoreEl.textContent = newScore;
        }

        const athlete = this.participants.find((p) => p.id === playerId);
        const soundType = athlete && athlete.sound ? athlete.sound : "default";

        if (delta > 0) {
            soundEngine.play(soundType);
            this.triggerCardFlash(cardElement);
        } else {
            soundEngine.play("penalty");
        }
    }

    // Визуальная вспышка контура при касании
    triggerCardFlash(cardElement) {
        cardElement.classList.add("flash-impact");
        requestAnimationFrame(() => {
            setTimeout(() => {
                cardElement.classList.remove("flash-impact");
            }, 80);
        });
    }

    // Завершение раунда с записью в архив IndexedDB
    async finishRound() {
        soundEngine.play("whistle");

        const roundResults = this.participants.map((p) => ({
            id: p.id,
            name: p.name,
            score: this.scores.get(p.id) || 0
        }));

        const summary = {
            id: "round_" + Date.now(),
            type: "matrix_counter",
            timestamp: Date.now(),
            results: roundResults
        };

        try {
            await storage.archiveSession(summary);
        } catch (err) {
            console.error("Ошибка сохранения результатов раунда:", err);
        }

        if (confirm("Раунд завершен! Зафиксировать результаты и обнулить счет?")) {
            this.scores.forEach((_, id) => this.scores.set(id, 0));
            this.render();
        }
    }

    // Отрисовка адаптивной сетки для 2–8 спортсменов
    render() {
        if (!this.container) return;

        const count = this.participants.length;
        // Расчет динамической сетки в зависимости от числа спортсменов на корте
        let gridCols = "repeat(2, 1fr)";
        if (count >= 5) {
            gridCols = "repeat(4, 1fr)";
        } else if (count >= 3) {
            gridCols = "repeat(3, 1fr)";
        }

        this.container.innerHTML = `
            <div class="counter-view">
                <header class="counter-header">
                    <button type="button" class="btn btn-secondary btn-nav" id="btn-back-roster">
                        ❮ Ростер
                    </button>
                    <div class="counter-title-group">
                        <h1 class="counter-title">Табло касаний</h1>
                        <span class="counter-status">Участников: ${count}</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-round" id="btn-finish-round">
                        Завершить раунд
                    </button>
                </header>

                <div class="counter-grid" style="grid-template-columns: ${gridCols};">
                    ${this.participants.map((athlete) => {
                        const score = this.scores.get(athlete.id) || 0;
                        return `
                            <div class="matrix-card" data-id="${athlete.id}" style="--player-accent: ${athlete.color || '#3b82f6'};">
                                <div class="card-header-bar">
                                    <span class="player-name">${athlete.name}</span>
                                    <button type="button" class="btn-minus" data-action="minus" title="Снять 1 очко">-1</button>
                                </div>
                                <div class="card-hit-area">
                                    <span class="score-value">${score}</span>
                                    <span class="hit-hint">ТАП</span>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;

        this._bindEvents();
    }

    _bindEvents() {
        // Обработка касаний карточек спортсменов (Pointer Events)
        const cards = this.container.querySelectorAll(".matrix-card");
        cards.forEach((card) => {
            const playerId = card.getAttribute("data-id");

            // Тап по всей поверхности карточки (+1)
            card.addEventListener("pointerdown", (e) => {
                // Если тап пришелся по кнопке вычитания, не добавляем очко
                if (e.target.closest('[data-action="minus"]')) return;
                e.preventDefault();
                this.handleTap(playerId, 1, e.pointerId, card);
            });

            // Кнопка штрафа / отмены очка (-1)
            const minusBtn = card.querySelector('[data-action="minus"]');
            if (minusBtn) {
                minusBtn.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleTap(playerId, -1, e.pointerId, card);
                });
            }
        });

        // Кнопка завершения раунда
        const btnFinish = this.container.querySelector("#btn-finish-round");
        if (btnFinish) {
            btnFinish.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                this.finishRound();
            });
        }

        // Кнопка возврата в Ростер
        const btnBack = this.container.querySelector("#btn-back-roster");
        if (btnBack) {
            btnBack.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                if (typeof this.onBackToRoster === "function") {
                    this.onBackToRoster();
                }
            });
        }
    }
}