// Модуль 1: Ростер и Сессия (Tennis Pro)
// Управление составом спортсменов, чекин на тренировку и резервное копирование

import { storage } from "../core/storage.js";
import { soundEngine } from "../core/audio.js";

export class RosterModule {
    constructor(containerElement, onSessionStartCallback) {
        this.container = containerElement;
        this.onSessionStart = onSessionStartCallback;

        this.athletes = [];
        this.selectedAthleteIds = new Set();
        this.isModalOpen = false;

        this.init();
    }

    async init() {
        try {
            this.athletes = await storage.getRoster();
            this._restoreActiveSessionCheckins();
            this.render();
        } catch (err) {
            console.error("Ошибка инициализации ростера:", err);
            this.container.innerHTML = `<div class="error-banner">Сбой загрузки базы участников</div>`;
        }
    }

    // Восстановление чекина, если тренировка уже была начата ранее
    _restoreActiveSessionCheckins() {
        const session = storage.getActiveSession();
        if (session && Array.isArray(session.participantIds)) {
            session.participantIds.forEach((id) => this.selectedAthleteIds.add(id));
        } else {
            // По умолчанию выбираем первых 4 участников для быстрого старта
            this.athletes.slice(0, 4).forEach((a) => this.selectedAthleteIds.add(a.id));
        }
    }

    // Переключение статуса чекина спортсмена
    toggleAthlete(athleteId) {
        const athlete = this.athletes.find((a) => a.id === athleteId);
        const sound = athlete && athlete.sound ? athlete.sound : "default";

        if (this.selectedAthleteIds.has(athleteId)) {
            // Минимум 2 участника на корте
            if (this.selectedAthleteIds.size <= 2) {
                soundEngine.play("penalty");
                return;
            }
            this.selectedAthleteIds.delete(athleteId);
            soundEngine.play("tick");
        } else {
            // Максимум 8 участников в одной сессии
            if (this.selectedAthleteIds.size >= 8) {
                soundEngine.play("penalty");
                return;
            }
            this.selectedAthleteIds.add(athleteId);
            soundEngine.play(sound);
        }

        this._persistCurrentSelection();
        this.render();
    }

    // Синхронизация состава с кэшем активной сессии
    _persistCurrentSelection() {
        const selectedList = this.athletes.filter((a) => this.selectedAthleteIds.has(a.id));
        const currentSession = storage.getActiveSession() || {};
        storage.saveActiveSession({
            ...currentSession,
            participantIds: Array.from(this.selectedAthleteIds),
            participants: selectedList,
            updatedAt: Date.now()
        });
    }

    // Добавление нового участника
    async addAthlete(name, color = "#3b82f6", sound = "default") {
        if (!name || !name.trim()) return;

        const newAthlete = {
            id: "p_" + Date.now(),
            name: name.trim(),
            color: color,
            sound: sound,
            createdAt: Date.now()
        };

        await storage.saveAthlete(newAthlete);
        this.athletes = await storage.getRoster();
        this.selectedAthleteIds.add(newAthlete.id);
        this._persistCurrentSelection();
        soundEngine.play("coin");
        this.render();
    }

    // Запуск тренировочной сессии с выбранным составом
    startSession() {
        if (this.selectedAthleteIds.size < 2) {
            soundEngine.play("penalty");
            return;
        }

        soundEngine.play("whistle");
        this._persistCurrentSelection();

        if (typeof this.onSessionStart === "function") {
            const selectedAthletes = this.athletes.filter((a) => this.selectedAthleteIds.has(a.id));
            this.onSessionStart(selectedAthletes);
        }
    }

    // Отрисовка интерфейса ростера
    render() {
        if (!this.container) return;

        const count = this.selectedAthleteIds.size;
        const canStart = count >= 2 && count <= 8;

        this.container.innerHTML = `
            <div class="roster-view">
                <header class="roster-header">
                    <div class="roster-meta">
                        <h1 class="roster-title">Чекин участников</h1>
                        <p class="roster-subtitle">Выбрано: <span class="badge ${canStart ? 'badge-ok' : 'badge-warn'}">${count} из 8</span> (минимум 2)</p>
                    </div>
                    <div class="roster-tools">
                        <button type="button" class="btn btn-secondary btn-icon" id="btn-export-backup" title="Экспорт базы в файл">
                            📥 Бэкап
                        </button>
                        <button type="button" class="btn btn-secondary btn-icon" id="btn-add-athlete" title="Добавить участника">
                            + Новый
                        </button>
                    </div>
                </header>

                <div class="roster-grid">
                    ${this.athletes.map((athlete) => {
                        const isChecked = this.selectedAthleteIds.has(athlete.id);
                        return `
                            <div class="athlete-card ${isChecked ? 'is-active' : ''}" 
                                 data-id="${athlete.id}" 
                                 style="--athlete-color: ${athlete.color};">
                                <div class="athlete-avatar">
                                    ${athlete.photo ? `<img src="${athlete.photo}" alt="${athlete.name}">` : athlete.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div class="athlete-info">
                                    <span class="athlete-name">${athlete.name}</span>
                                    <span class="athlete-status">${isChecked ? 'На корте' : 'Отдых'}</span>
                                </div>
                                <div class="athlete-checkbox">
                                    ${isChecked ? '✓' : ''}
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>

                <footer class="roster-actions">
                    <button type="button" class="btn btn-primary btn-large" id="btn-start-training" ${canStart ? '' : 'disabled'}>
                        Начать тренировку (${count}) ➔
                    </button>
                </footer>
            </div>
        `;

        this._bindDomEvents();
    }

    // Привязка Pointer Events для исключения 300мс задержки Safari
    _bindDomEvents() {
        // Тапы по карточкам спортсменов
        const cards = this.container.querySelectorAll(".athlete-card");
        cards.forEach((card) => {
            card.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                const athleteId = card.getAttribute("data-id");
                if (athleteId) this.toggleAthlete(athleteId);
            });
        });

        // Кнопка запуска тренировки
        const btnStart = this.container.querySelector("#btn-start-training");
        if (btnStart) {
            btnStart.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                this.startSession();
            });
        }

        // Кнопка бэкапа базы
        const btnExport = this.container.querySelector("#btn-export-backup");
        if (btnExport) {
            btnExport.addEventListener("pointerdown", async (e) => {
                e.preventDefault();
                soundEngine.play("laser");
                await storage.downloadBackupFile();
            });
        }

        // Кнопка создания нового участника
        const btnAdd = this.container.querySelector("#btn-add-athlete");
        if (btnAdd) {
            btnAdd.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                const name = prompt("Имя спортсмена:");
                if (name) {
                    this.addAthlete(name);
                }
            });
        }
    }
}