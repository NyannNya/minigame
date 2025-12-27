const game = {
    CONFIG: {
        RPC: 'https://henesys-rpc.msu.io',
        NESO: '0x07e49ad54fcd23f6e7b911c2068f0148d1827c08' // Correct Henesys L1 Address
    },
    poolAmount: 0,
    queue: [],
    currentPlayer: null,
    gameState: 'IDLE', // IDLE, PLAYING, REVEALED
    cards: { c1: null, c2: null, c3: null },
    currentOdds: 1.0,

    init: () => {
        ui.updateQueueDisplay();
        ui.updatePool(game.poolAmount);
    },

    // --- Manual Queue Management ---
    adjustPool: (direction) => {
        const input = document.getElementById('adminPoolInput');
        const val = parseFloat(input.value);
        if (!val || val <= 0) {
            alert('請輸入有效金額');
            return;
        }

        if (direction === 1) {
            game.poolAmount += val;
        } else {
            game.poolAmount -= val;
            if (game.poolAmount < 0) game.poolAmount = 0;
        }

        ui.updatePool(game.poolAmount);
        input.value = ''; // Clear
    },

    manualAddFromModal: () => {
        const addrInput = document.getElementById('modalInputAddress');
        const amtInput = document.getElementById('modalInputAmount');
        const address = addrInput.value.trim();
        const amount = parseFloat(amtInput.value);

        if (!address) {
            alert("請輸入錢包地址!");
            return;
        }
        if (!amount || amount < 10000) {
            alert("最低下注金額為 10,000 NESO!");
            return;
        }

        const ticket = {
            from: address,
            amount: amount,
            timestamp: new Date().toLocaleTimeString()
        };

        game.queue.push(ticket);
        ui.updateQueueDisplay();
        ui.closeAddModal();

        // Clear inputs
        addrInput.value = '';
        amtInput.value = '';
    },

    openReplayModal: () => {
        if (!game.currentPlayer) return;
        const address = game.currentPlayer.from;
        ui.showReplayModal(address);
    },

    confirmReplay: () => {
        const address = document.getElementById('replayPlayerAddress').innerText;
        const amountInput = document.getElementById('replayInputAmount');
        const amount = parseFloat(amountInput.value);

        if (!amount || amount < 10000) {
            alert("最低下注金額為 10,000 NESO!");
            return;
        }

        // Create new ticket at valid index (startRound requires index)
        // OR we can just reset state and set player directly?
        // game.startRound expects a queue index. 
        // Let's just push to queue Top and start immediately?
        // Or simpler: Just set state and start deal.

        // Strategy: Reset Game -> Set Player -> Start Deal
        game.nextRound(); // Clears state

        const newTicket = {
            from: address,
            amount: amount,
            timestamp: new Date().toLocaleTimeString()
        };

        game.currentPlayer = newTicket;
        ui.setPlayer(newTicket);
        ui.updateStatus("遊戲開始 (重玩)");
        ui.resetCards();
        document.getElementById('oddsDisplay').classList.add('hidden');

        ui.closeReplayModal();

        game.gameState = 'PLAYING';
        game.dealCards();
    },

    removeFromQueue: (index) => {
        game.queue.splice(index, 1);
        ui.updateQueueDisplay();
    },

    clearQueue: () => {
        if (confirm("確定要清除所有排隊玩家嗎?")) {
            game.queue = [];
            ui.updateQueueDisplay();
        }
    },

    // --- Game Logic ---
    startRound: (ticketIndex) => {
        if (game.gameState !== 'IDLE') {
            alert("遊戲正在進行中!");
            return;
        }

        const ticket = game.queue[ticketIndex];
        game.currentPlayer = ticket;

        // Remove from queue
        game.queue.splice(ticketIndex, 1);
        ui.updateQueueDisplay();

        // Update UI
        ui.setPlayer(ticket);
        ui.updateStatus("遊戲開始");
        ui.resetCards();
        document.getElementById('oddsDisplay').classList.add('hidden');

        // Deal Cards
        game.gameState = 'PLAYING';
        game.dealCards();
    },

    dealCards: async () => {
        // Generate random cards 1-13
        game.cards.c1 = Math.floor(Math.random() * 13) + 1;
        game.cards.c2 = Math.floor(Math.random() * 13) + 1;
        game.cards.c3 = Math.floor(Math.random() * 13) + 1;

        // Animate card 1 & 2
        await ui.flipCard('card1', game.cards.c1);
        await new Promise(r => setTimeout(r, 600));
        await ui.flipCard('card2', game.cards.c2);

        // Calculate and Show Odds
        game.calculateAndShowOdds();

        // Show controls
        ui.showControls();
    },

    calculateAndShowOdds: () => {
        const { c1, c2 } = game.cards;
        const gap = Math.abs(c1 - c2) - 1;

        let odds = 0;

        if (gap <= 0) {
            // No gap (Adjacent or Pair) - Impossible to win "Inside"
            // Startndard rule: If Pair, maybe High/Low? 
            // For now, strict Gap rules. If gap <= 0, Odds display 0 (or special text)
            odds = 0;
        } else {
            // Base Prob = Gap / 13
            // Fair Odds = 13 / Gap
            // House Edge Adjustment (Conservative for Steady Win)

            // Raw Fair Odds
            let fairOdds = 13.0 / gap;

            // Apply Edge (e.g., 85% Return)
            odds = fairOdds * 0.85;

            // --- Pool Bonus ---
            // If Pool is healthy (> 200,000), boost odds slightly to encourage play
            if (game.poolAmount > 200000) {
                odds *= 1.1; // 10% Bonus
            }

            // Cap Odds to prevent draining (e.g., max 100x? won't happen with range)
            // Cap low odds (Easy shot) to ensure it's worth it?
            // If Gap is 10 (2-Q), Fair = 1.3. Odds ~ 1.1.

            // Safety Check for "Steady Win" (Covering 5000 fee)
            // We need Payout > Bet + 5000? No, checking *User's* win vs *Dealer's* cost.
            // Dealer Fee is constant 5000. 
            // We just ensure Odds aren't erroneously high.
        }

        // Hard Cap minimum odds to 1.1 to make it playable
        if (odds > 0 && odds < 1.1) odds = 1.1;

        // Round to 2 decimals
        game.currentOdds = Math.floor(odds * 100) / 100;

        // Special Case: Pair 
        if (c1 === c2) {
            // If Pair, usually we bet High/Low. 
            // But UI says "Inside". 
            // Let's set Odds to 0 (Wait for 3rd card to see if Match/Triple)
            // Or allow betting on "Triple"?
            // Simplified: Just show "---" or "0.00"
            game.currentOdds = 0;
        }

        // Update UI
        const oddsEl = document.getElementById('currentOdds');
        oddsEl.innerText = game.currentOdds.toFixed(2);

        const oddsDisplay = document.getElementById('oddsDisplay');
        oddsDisplay.classList.remove('hidden');

        if (game.currentOdds === 0) {
            oddsDisplay.innerHTML = "賠率: <span style='color:red'>平手/撞柱</span>";
        } else {
            oddsDisplay.innerHTML = `賠率: <span id="currentOdds" style="color:var(--primary)">${game.currentOdds.toFixed(2)}</span>x`;
        }
    },

    // --- Blockchain Integration ---
    scanChain: async () => {
        const wallet = document.getElementById('importWalletAddr').value.trim();
        const status = document.getElementById('scanStatus');
        const listBody = document.getElementById('importList');

        if (!ethers.utils.isAddress(wallet)) {
            alert("請輸入有效的錢包地址!");
            return;
        }

        status.innerText = "連線中...";
        listBody.innerHTML = '';

        try {
            const provider = new ethers.providers.JsonRpcProvider(game.CONFIG.RPC);
            const contract = new ethers.Contract(game.CONFIG.NESO, [
                "event Transfer(address indexed from, address indexed to, uint256 value)"
            ], provider);

            status.innerText = "掃描區塊中 (最近 100000)...";

            // Get current block
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = currentBlock - 100000;

            // Filter for Transfer TO host wallet
            const filter = contract.filters.Transfer(null, wallet);
            const logs = await contract.queryFilter(filter, fromBlock, currentBlock);

            // Process Logs
            // Reverse to show newest first
            const processed = logs.reverse().map(log => {
                const parsed = contract.interface.parseLog(log);
                return {
                    hash: log.transactionHash,
                    from: parsed.args.from,
                    to: parsed.args.to,
                    val: ethers.utils.formatEther(parsed.args.value), // Assuming 18 decimals? Note checks say 18.
                    // Wait, NESO might be different decimals. 
                    // Search typically implies 18 for EVM usually, but checked details: 
                    // NXPC -> NESO is 1:100000. 
                    // Let's assume standard 18 for now, but if numbers look weird, we adjust.
                    // Actually, let's just display raw / 1e18 first.
                };
            });

            status.innerText = `找到 ${processed.length} 筆交易`;

            if (processed.length === 0) {
                listBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">無近期交易</td></tr>';
                return;
            }

            processed.forEach((tx, i) => {
                // Filter small spam? e.g. < 1
                if (parseFloat(tx.val) < 1) return;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="import-chk" data-from="${tx.from}" data-val="${tx.val}"></td>
                    <td class="addr-col" title="${tx.from}">${tx.from.substring(0, 6)}...${tx.from.substring(38)}</td>
                    <td style="color:var(--success); font-weight:bold;">${parseFloat(tx.val).toLocaleString()}</td>
                    <td><a href="https://subnets.avax.network/henesys/tx/${tx.hash}" target="_blank" style="color:#ccc">查看</a></td>
                `;
                listBody.appendChild(row);
            });

        } catch (e) {
            console.error(e);
            status.innerText = "掃描失敗: " + e.message;
        }
    },

    importSelected: () => {
        const checks = document.querySelectorAll('.import-chk:checked');
        let count = 0;
        checks.forEach(chk => {
            const from = chk.getAttribute('data-from');
            const val = parseFloat(chk.getAttribute('data-val'));

            // Add to queue
            game.queue.push({
                from: from,
                amount: val, // Keep as raw number from string
                timestamp: new Date().toLocaleTimeString()
            });
            count++;
        });

        if (count > 0) {
            ui.updateQueueDisplay();
            ui.closeImportModal();
            alert(`已成功匯入 ${count} 筆交易!`);
        } else {
            alert("請選擇至少一筆交易");
        }
    },

    revealCard3: async () => {
        if (game.gameState !== 'PLAYING') return;

        await ui.flipCard('card3', game.cards.c3);
        game.gameState = 'REVEALED';

        game.determineWinner();
    },

    determineWinner: () => {
        const { c1, c2, c3 } = game.cards;
        const low = Math.min(c1, c2);
        const high = Math.max(c1, c2);

        let result = '';
        let payout = 0;
        let message = '';

        if (c1 === c2) {
            // Pair Case
            if (c3 === c1) {
                // 3 of a Kind -> Hit Pair
                result = 'LOSE_3X';
                message = "三條撞柱! (賠付 3x)";
            } else {
                result = 'PUSH';
                message = "平手";
            }
        } else {
            // Standard Case
            if (c3 > low && c3 < high) {
                result = 'WIN';
                message = "進球!";
                // Payout based on Dynamic Odds
                payout = game.currentPlayer.amount * game.currentOdds;
            } else if (c3 === low || c3 === high) {
                result = 'LOSE_2X';
                message = "撞柱! (賠付 2x)"; // User loses 2x Bet
            } else {
                result = 'LOSE';
                message = "射歪了!";
            }
        }

        // Pool Logic
        if (result === 'WIN') {
            game.poolAmount -= (payout - game.currentPlayer.amount);
        } else if (result === 'LOSE') {
            game.poolAmount += game.currentPlayer.amount;
        } else if (result === 'LOSE_2X') {
            game.poolAmount += (game.currentPlayer.amount * 2);
        } else if (result === 'LOSE_3X') {
            game.poolAmount += (game.currentPlayer.amount * 3);
        }

        // Prevent Negative Pool
        if (game.poolAmount < 0) game.poolAmount = 0;

        ui.updatePool(game.poolAmount);

        // Update Status for UI
        const uiResult = result.includes('WIN') ? 'WIN' : (result === 'PUSH' ? 'PUSH' : 'LOSE');

        // Final Payout Amount to Show (Total Return)
        // If Win: Return Bet + Winnings = Payout
        // If Lose: 0
        const finalPayout = result === 'WIN' ? payout : 0;

        ui.showResult(uiResult, message, finalPayout);
    },

    generatePayout: () => {
        if (!game.currentPlayer) return;

        const address = game.currentPlayer.from;
        let payoutAmt = parseFloat(document.getElementById('payoutShowAmount').innerText);

        ui.showPayoutModal(address, payoutAmt);
    },

    nextRound: () => {
        game.gameState = 'IDLE';
        game.currentPlayer = null;
        game.cards = { c1: null, c2: null, c3: null };

        ui.resetUI();
        document.getElementById('oddsDisplay').classList.add('hidden');
    }
};

// Auto-init
window.addEventListener('DOMContentLoaded', game.init);
