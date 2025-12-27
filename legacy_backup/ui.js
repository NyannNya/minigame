const ui = {
    updateStatus: (msg) => {
        const el = document.getElementById('gameStatus');
        if (el) el.innerText = msg;
    },

    updateQueueDisplay: () => {
        const list = document.getElementById('queueList');
        const count = document.getElementById('queueCount');
        count.innerText = game.queue.length;

        // Ensure Clear button visibility
        const clearBtn = document.getElementById('btnClearQueue');
        if (clearBtn) clearBtn.style.display = game.queue.length > 0 ? 'inline-block' : 'none';

        list.innerHTML = '';

        if (game.queue.length === 0) {
            list.innerHTML = '<div class="empty-state">目前沒有玩家排隊</div>';
            return;
        }

        game.queue.forEach((ticket, index) => {
            const div = document.createElement('div');
            div.className = 'queue-item';
            div.innerHTML = `
                <div class="q-info">
                    <span class="q-addr" title="${ticket.from}">${ticket.from}</span>
                    <span class="q-amt">💲${Math.floor(ticket.amount).toLocaleString()}</span>
                </div>
                <div class="q-actions">
                    <button class="btn-play-small" onclick="game.startRound(${index})">▶ 開始</button>
                    <button class="btn-delete-small" onclick="game.removeFromQueue(${index})">🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });
    },

    updatePool: (amount) => {
        document.getElementById('poolAmount').innerText = Math.floor(amount).toLocaleString();
    },

    setPlayer: (ticket) => {
        document.getElementById('currentPlayerDisplay').classList.remove('hidden');
        document.getElementById('playerAddress').innerText = ticket.from;
        document.getElementById('playerBetAmount').innerText = Math.floor(ticket.amount).toLocaleString();
    },

    flipCard: async (cardId, value) => {
        const card = document.getElementById(cardId);
        const inner = card.querySelector('.card-inner');
        const back = card.querySelector('.card-back');

        // Map 1, 11, 12, 13 to A, J, Q, K
        let displayVal = value;
        if (value === 1) displayVal = 'A';
        if (value === 11) displayVal = 'J';
        if (value === 12) displayVal = 'Q';
        if (value === 13) displayVal = 'K';

        // Set color
        back.style.color = (value === 1 || value === 4 || value === 8 || value === 11) ? '#e74c3c' : '#2c3e50';
        back.innerText = displayVal;

        // Flip animation
        card.classList.add('flip');
    },

    resetCards: () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('flip'));
        document.getElementById('gameStatus').innerText = "發牌中...";
        document.getElementById('gameStatus').className = 'game-status';

        document.getElementById('gameControls').classList.add('hidden');
        document.getElementById('resultActions').classList.add('hidden');
        document.getElementById('btnReveal').classList.remove('hidden');
    },

    showControls: () => {
        document.getElementById('gameControls').classList.remove('hidden');
        document.getElementById('gameStatus').innerText = "請射門!";
    },

    showResult: (result, msg, payout) => {
        const board = document.getElementById('gameStatus');
        board.innerText = msg;
        board.className = 'game-status ' + (result === 'WIN' ? 'win' : result === 'MP' ? 'mp' : 'lose');

        document.getElementById('btnReveal').classList.add('hidden');
        document.getElementById('resultActions').classList.remove('hidden');

        const btnPayout = document.getElementById('btnPayout');
        if (result === 'WIN') {
            btnPayout.classList.remove('hidden');
            document.getElementById('payoutShowAmount').innerText = Math.floor(payout).toLocaleString();
        } else {
            btnPayout.classList.add('hidden');
        }
    },

    // --- Modal Logic ---
    openAddModal: () => {
        const modal = document.getElementById('addPlayerModal');
        modal.showModal();
        document.getElementById('modalInputAddress').focus();
    },

    closeAddModal: () => {
        document.getElementById('addPlayerModal').close();
    },

    showReplayModal: (address) => {
        const modal = document.getElementById('replayModal');
        modal.showModal();
        document.getElementById('replayPlayerAddress').innerText = address;
        document.getElementById('replayInputAmount').value = '';
        document.getElementById('replayInputAmount').focus();
    },

    closeReplayModal: () => {
        document.getElementById('replayModal').close();
    },

    openImportModal: () => {
        const modal = document.getElementById('importModal');
        modal.showModal();
        // Load saved wallet
        const saved = localStorage.getItem('hostWallet');
        if (saved) {
            document.getElementById('importWalletAddr').value = saved;
        }
    },

    closeImportModal: () => {
        document.getElementById('importModal').close();
    },

    showPayoutModal: (address, amount) => {
        modal.showModal();
        document.getElementById('payoutAddress').innerText = address;
        document.getElementById('payoutShowAmount').innerText = Math.floor(amount).toLocaleString();
        document.getElementById('copyHint').style.opacity = '0';
    },

    closeModal: () => {
        document.getElementById('payoutModal').close();
    },

    copyToClipboard: (elementId) => {
        const val = document.getElementById(elementId).innerText || document.getElementById(elementId).value;
        navigator.clipboard.writeText(val);
    },

    copyWinnerAddress: () => {
        const address = document.getElementById('payoutAddress').innerText;
        navigator.clipboard.writeText(address).then(() => {
            const hint = document.getElementById('copyHint');
            hint.style.opacity = '1';
        });
    },

    resetUI: () => {
        document.getElementById('currentPlayerDisplay').classList.add('hidden');
        document.querySelectorAll('.card').forEach(c => c.classList.remove('flip'));
        document.getElementById('gameStatus').innerText = "等待開始";
        document.getElementById('gameStatus').className = 'game-status';
        document.getElementById('gameControls').classList.add('hidden');
    }
};
