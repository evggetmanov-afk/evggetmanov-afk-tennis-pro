// Скоростное табло касаний Matrix Counter с мультикасанием и звуком
import { playSound } from '../core/audio.js';
import { sessionManager } from '../core/session.js';

class MatrixCounter {
    constructor(rootElement) {
        this.root = rootElement;
        this.players = [];
    }

    init() {
        this.players = sessionManager.getActivePlayers();
        if (this.players.length === 0) {
            // Если сессия не начата, стартуем с первыми 4 игроками ростера
            const session = sessionManager.startSession(['p1', 'p2', 'p3', 'p4']);
            this.players = session ? session.players : [];
        }
        this.render();
    }

    render() {
        this.root.innerHTML = `
            <div class="counter-container">
                <header class="counter-header">
                    <h2>Matrix Counter</h2>
                    <button id="btn-finish-round" class="btn-sub">Завершить раунд</button>
                </header>
                <div class="counter-grid" id="counter-grid"></div>
            </div>
        `;

        const grid = this.root.querySelector('#counter-grid');
        grid.innerHTML = '';

        this.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.style.backgroundColor = player.color || '#1e293b';
            card.dataset.id = player.id;

            card.innerHTML = `
                <div class="flash-overlay"></div>
                <div class="player-name">${player.name}</div>
                <div class="score-display">${player.score}</div>
                <div class="card-footer">
                    <button class="btn-sub" data-action="minus">-1</button>
                </div>
            `;

            // Обработка касания/клика по карточке (добавление очка)
            card.addEventListener('pointerdown', (e) => {
                if (e.target.dataset.action === 'minus') return;
                this.handlePoint(player.id, 1, card);
            });

            // Кнопка вычитания очка
            const minusBtn = card.querySelector('[data-action="minus"]');
            minusBtn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.handlePoint(player.id, -1, card);
            });

            grid.appendChild(card);
        });

        const finishBtn = this.root.querySelector('#btn-finish-round');
        finishBtn.addEventListener('click', () => this.finishRound());
    }

    handlePoint(playerId, delta, cardElement) {
        const updated = sessionManager.addPoints(playerId, delta, 'matrix_counter');
        if (!updated) return;

        const scoreEl = cardElement.querySelector('.score-display');
        if (scoreEl) {
            scoreEl.textContent = updated.score;
        }

        if (delta > 0) {
            playSound(updated.sound || 'laser');
            this.triggerFlash(cardElement);
        } else {
            playSound('spring');
        }
    }

    triggerFlash(cardElement) {
        const flash = cardElement.querySelector('.flash-overlay');
        if (!flash) return;
        flash.classList.add('flash-active');
        requestAnimationFrame(() => {
            setTimeout(() => {
                flash.classList.remove('flash-active');
            }, 60);
        });
    }

    finishRound() {
        const roundSnapshot = this.players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score
        }));
        sessionManager.commitRound('matrix_counter', roundSnapshot);
        playSound('fanfare');
    }
}

export const matrixCounter = new MatrixCounter(document.getElementById('app'));