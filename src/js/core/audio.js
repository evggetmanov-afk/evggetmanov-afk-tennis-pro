// Процедурный звуковой движок (Web Audio API) по стандарту Tennis Pro
// 100% Offline-first, Zero-Dependency, защита от сбоев Safari iPadOS (Audio Lifecycle)

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
        this._bindLifecycleEvents();
    }

    // Инициализация и разблокировка AudioContext по первому жесту тренера
    unlock() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                console.warn("Web Audio API не поддерживается данным браузером.");
                return;
            }
            this.ctx = new AudioCtx();
        }

        if (this.ctx.state === "suspended") {
            this.ctx.resume().then(() => {
                this.isUnlocked = true;
            }).catch((err) => {
                console.error("Не удалось восстановить AudioContext:", err);
            });
        } else if (this.ctx.state === "running") {
            this.isUnlocked = true;
        }
    }

    // Обработка жизненного цикла iPadOS (пробуждение экрана, разблокировка)
    _bindLifecycleEvents() {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                this._ensureActiveContext();
            }
        });

        // Глобальный перехват первого тапа для гарантированного снятия блокировки автоплея
        const unlockHandler = () => {
            this.unlock();
            window.removeEventListener("pointerdown", unlockHandler);
            window.removeEventListener("keydown", unlockHandler);
        };
        window.addEventListener("pointerdown", unlockHandler, { passive: true });
        window.addEventListener("keydown", unlockHandler, { passive: true });
    }

    // Проверка и восстановление контекста после прерывания (interrupted на iOS)
    async _ensureActiveContext() {
        if (!this.ctx) return;

        if (this.ctx.state === "interrupted" || this.ctx.state === "suspended") {
            try {
                await this.ctx.resume();
            } catch (e) {
                console.warn("Повторная инициализация после interrupted...");
                try {
                    await this.ctx.close();
                } catch (_) {}
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
                await this.ctx.resume();
            }
        }
    }

    // Безопасное воспроизведение процедурных эффектов
    async play(soundType = "default") {
        if (!this.ctx) {
            this.unlock();
        }
        await this._ensureActiveContext();

        if (!this.ctx || this.ctx.state !== "running") return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Безопасная сборка аудиотракта
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Автоматическая очистка ресурсов и защита от утечек памяти Safari
        const cleanup = (duration) => {
            osc.start(now);
            osc.stop(now + duration);
            setTimeout(() => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (_) {}
            }, (duration + 0.05) * 1000);
        };

        switch (soundType) {
            // Лазер (быстрый свист для скоростных серий)
            case "laser": {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(1100, now);
                osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);
                gain.gain.setValueAtTime(0.28, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                cleanup(0.14);
                break;
            }

            // Монета (звонкий двутональный колокольчик)
            case "coin": {
                osc.type = "sine";
                osc.frequency.setValueAtTime(1174.66, now); // D6
                osc.frequency.setValueAtTime(1760.00, now + 0.06); // A6
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                cleanup(0.22);
                break;
            }

            // Пружина (восходящий тон для модулей сокровищ/бонусов)
            case "spring": {
                osc.type = "sine";
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                cleanup(0.16);
                break;
            }

            // Штрафной гудок (тяжелый низкий диссонанс для секундных штрафов)
            case "penalty": {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.linearRampToValueAtTime(90, now + 0.25);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                cleanup(0.25);
                break;
            }

            // Свисток старта / финиша секундомера
            case "whistle": {
                osc.type = "sine";
                osc.frequency.setValueAtTime(2400, now);
                osc.frequency.linearRampToValueAtTime(2200, now + 0.28);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                cleanup(0.28);
                break;
            }

            // Трещотка («Однорукий бандит» / быстрый тактильный щелчок)
            case "tick": {
                osc.type = "square";
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                cleanup(0.03);
                break;
            }

            // Стандартный тап по умолчанию
            default: {
                osc.type = "sine";
                osc.frequency.setValueAtTime(520, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                cleanup(0.08);
                break;
            }
        }
    }
}

export const soundEngine = new SoundEngine();