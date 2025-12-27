import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { RefreshCw, Trash2, Plus, ExternalLink, Settings, Copy, Edit2 } from 'lucide-react';
import '../index.css';

const CONFIG = {
    RPC: 'https://henesys-rpc.msu.io',
    NESO: '0x07e49ad54fcd23f6e7b911c2068f0148d1827c08',
    SCAN_BLOCKS: 100000
};

const StreamerGame = () => {
    // Game State
    const [poolAmount, setPoolAmount] = useState(0);
    const [queue, setQueue] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [gameState, setGameState] = useState('IDLE');
    const [cards, setCards] = useState({ c1: null, c2: null, c3: null });
    const [currentOdds, setCurrentOdds] = useState(1.0);
    const [gameMessage, setGameMessage] = useState('等待開始');
    const [finalPayout, setFinalPayout] = useState(0);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showReplayModal, setShowReplayModal] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Inputs
    const [modalAddress, setModalAddress] = useState('');
    const [modalNickname, setModalNickname] = useState('');
    const [modalAmount, setModalAmount] = useState(10000);
    const [replayAmount, setReplayAmount] = useState(0);

    // Address Book State
    const [nicknameMap, setNicknameMap] = useState(() => {
        const saved = localStorage.getItem('nicknameMap');
        return saved ? JSON.parse(saved) : {};
    });

    // Import State
    const [importWallet, setImportWallet] = useState(localStorage.getItem('hostWallet') || '');
    const [scanStatus, setScanStatus] = useState('');
    const [scanResults, setScanResults] = useState([]);
    const [selectedTx, setSelectedTx] = useState({});

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('nicknameMap', JSON.stringify(nicknameMap));
    }, [nicknameMap]);

    // --- Helpers ---
    const formatNum = (num) => Math.floor(num).toLocaleString();

    const getNickname = (addr) => nicknameMap[addr] || '';

    const formatAddr = (p) => {
        if (!p) return 'UNKNOWN';
        const name = p.nickname || getNickname(p.from);
        if (name) return `${name} (${p.from.substring(0, 4)}...${p.from.substring(38)})`;
        return `${p.from.substring(0, 6)}...${p.from.substring(38)}`;
    };

    const getShortAddr = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(38)}` : '';

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Maybe a toast? For now just silent or console
        console.log("Copied", text);
    };

    // --- Game Logic ---
    const manualAddPlayer = () => {
        if (!modalAddress) return alert("請輸入錢包地址");
        if (modalAmount < 10000) return alert("最低下注 10,000");

        if (modalNickname) {
            setNicknameMap(prev => ({ ...prev, [modalAddress]: modalNickname }));
        }

        setQueue([...queue, {
            from: modalAddress,
            nickname: modalNickname,
            amount: modalAmount,
            timestamp: new Date().toLocaleTimeString()
        }]);
        setShowAddModal(false);
        setModalAddress('');
        setModalNickname('');
    };

    const handleEditNickname = (index) => {
        const p = queue[index];
        const targetAddress = p.from;
        const oldName = p.nickname || getNickname(targetAddress);
        const newName = prompt(`修改 ${getShortAddr(targetAddress)} 的暱稱:`, oldName);

        if (newName !== null) {
            // Update map logic (Global persistence)
            setNicknameMap(prev => ({ ...prev, [targetAddress]: newName }));

            // Update ALL queue items with this address
            setQueue(prevQueue => prevQueue.map(item =>
                item.from === targetAddress ? { ...item, nickname: newName } : item
            ));
        }
    };

    const startRound = (index) => {
        if (gameState !== 'IDLE') return alert("遊戲進行中");

        const player = queue[index];
        const newQueue = [...queue];
        newQueue.splice(index, 1);

        setQueue(newQueue);
        setCurrentPlayer(player);
        setGameState('PLAYING');
        setGameMessage("遊戲開始");
        setCards({ c1: null, c2: null, c3: null });
        setFinalPayout(0);
        dealCards();
    };

    const dealCards = async () => {
        const c1 = Math.floor(Math.random() * 13) + 1;
        const c2 = Math.floor(Math.random() * 13) + 1;
        const c3 = Math.floor(Math.random() * 13) + 1;

        setCards(prev => ({ ...prev, c1 }));
        setTimeout(() => {
            setCards(prev => ({ ...prev, c2 }));
            calculateOdds(c1, c2);
            setCards(prev => ({ ...prev, c1, c2, c3_hidden: c3 }));
        }, 600);
    };

    const calculateOdds = (c1, c2) => {
        const gap = Math.abs(c1 - c2) - 1;
        let odds = 0;
        if (gap <= 0) {
            odds = 0;
        } else {
            let fairOdds = 13.0 / gap;
            odds = fairOdds * 0.95; // Standard 5% House Edge
            if (poolAmount > 200000) odds *= 1.1; // Restore small bonus for large pools
        }
        if (odds > 0 && odds < 1.1) odds = 1.1;
        setCurrentOdds(Math.floor(odds * 100) / 100);
    };

    const revealCard3 = () => {
        if (gameState !== 'PLAYING') return;
        const { c1, c2, c3_hidden } = cards;
        setCards(prev => ({ ...prev, c3: c3_hidden }));
        setGameState('REVEALED');
        determineWinner(c1, c2, c3_hidden);
    };

    const determineWinner = (c1, c2, c3) => {
        const low = Math.min(c1, c2);
        const high = Math.max(c1, c2);
        let result = '';
        let message = '';
        let payout = 0;
        let paymentRequired = 0;

        if (c1 === c2) {
            if (c3 === c1) {
                result = 'LOSE_3X';
                message = "三條撞柱! (賠付 3x)";
                paymentRequired = currentPlayer.amount * 3;
                setPoolAmount(p => p + paymentRequired);
            } else {
                result = 'PUSH';
                message = "對子 (平手)";
            }
        } else {
            if (c3 > low && c3 < high) {
                result = 'WIN';
                message = "進球! (贏!)";
                payout = Math.floor(currentPlayer.amount * currentOdds);
                setPoolAmount(p => p - (payout - currentPlayer.amount));
            } else if (c3 === low || c3 === high) {
                result = 'LOSE_2X';
                message = "撞柱! (賠付 2x)";
                paymentRequired = currentPlayer.amount * 2;
                setPoolAmount(p => p + paymentRequired);
            } else {
                result = 'LOSE';
                message = "射歪了! (輸)";
                paymentRequired = currentPlayer.amount; // Just the bet
                setPoolAmount(p => p + paymentRequired);
            }
        }

        if (poolAmount < 0) setPoolAmount(0);
        setGameMessage(message);
        setFinalPayout(result === 'WIN' ? payout : paymentRequired); // Store payment amt if lost
        setGameState('END');

        if (result === 'WIN') {
            setShowPayoutModal(true);
        } else if (result === 'LOSE_2X' || result === 'LOSE_3X') {
            setShowPaymentModal(true); // Show Payment Prompt only for penalties
        }
    };

    const nextRound = () => {
        setGameState('IDLE');
        setCurrentPlayer(null);
        setCards({ c1: null, c2: null, c3: null });
        setGameMessage('等待開始');
        setCurrentOdds(0);
    };

    const replayRound = () => {
        if (!replayAmount || replayAmount < 10000) return alert("最低下注 10,000");
        nextRound();
        const newPlayer = { ...currentPlayer, amount: replayAmount, timestamp: new Date().toLocaleTimeString() };
        setCurrentPlayer(newPlayer);
        setGameState('PLAYING');
        setGameMessage("遊戲開始 (重玩)");
        dealCards();
        setShowReplayModal(false);
    };

    // --- Blockchain ---
    const scanChain = async () => {
        if (!ethers.utils.isAddress(importWallet)) return alert("無效的錢包地址");
        setScanStatus("連線中...");
        setScanResults([]);
        try {
            const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC);
            const contract = new ethers.Contract(CONFIG.NESO, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);

            setScanStatus(`掃描中 (最近 ${CONFIG.SCAN_BLOCKS} 區塊)...`);
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = currentBlock - CONFIG.SCAN_BLOCKS;
            const filter = contract.filters.Transfer(null, importWallet);
            const logs = await contract.queryFilter(filter, fromBlock, currentBlock);

            const processed = logs.reverse().map(log => {
                const parsed = contract.interface.parseLog(log);
                return {
                    hash: log.transactionHash,
                    from: parsed.args.from,
                    val: ethers.utils.formatEther(parsed.args.value),
                };
            }).filter(tx => parseFloat(tx.val) >= 1);

            setScanResults(processed);
            setScanStatus(`找到 ${processed.length} 筆交易`);
        } catch (e) {
            console.error(e);
            setScanStatus("掃描失敗: " + e.message);
        }
    };

    const importSelected = () => {
        const toAdd = scanResults.filter(tx => selectedTx[tx.hash]);
        if (toAdd.length === 0) return alert("請選擇交易");
        const newItems = toAdd.map(tx => ({
            from: tx.from,
            nickname: getNickname(tx.from), // Helper lookup
            amount: parseFloat(tx.val),
            timestamp: new Date().toLocaleTimeString()
        }));
        setQueue([...queue, ...newItems]);
        setShowImportModal(false);
        setScanResults([]);
        setSelectedTx({});
    };

    return (
        <div className="app-container">
            <main className="game-stage">
                <div className="Table">
                    <div className="cards-area">
                        <Card id="card1" val={cards.c1} />
                        <Card id="card3" val={cards.c3} isMystery={true} />
                        <Card id="card2" val={cards.c2} />
                    </div>

                    <div className="game-status-container">
                        {gameState !== 'IDLE' && gameState !== 'END' && (
                            <div className="odds-display" style={{ fontSize: '1.2rem', marginBottom: 10 }}>
                                賠率: <span style={{ color: 'var(--primary)' }}>{cards.c1 === cards.c2 ? '平手/撞柱' : `${currentOdds}x`}</span>
                            </div>
                        )}
                        <div className="game-status">{gameMessage}</div>
                    </div>

                    {currentPlayer && (
                        <div className="current-player">
                            <div className="player-avatar">😎</div>
                            <div className="player-details">
                                <div className="player-label">當前挑戰者</div>
                                <div className="player-address">{formatAddr(currentPlayer)}</div>
                                <div className="player-bet">
                                    <span className="label">下注: </span>
                                    <span className="amount">{formatNum(currentPlayer.amount)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="controls-overlay">
                    {gameState === 'PLAYING' && cards.c2 !== null && (
                        <button className="btn-action giant-btn" onClick={revealCard3}>🔥 射門! 🔥</button>
                    )}

                    {gameState === 'END' && (
                        <div className="result-actions" style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-replay" onClick={() => { setReplayAmount(currentPlayer.amount); setShowReplayModal(true); }}>🔄 再來一局</button>
                            <button className="btn-next" onClick={nextRound}>下一局 ⏭️</button>
                        </div>
                    )}
                </div>
            </main>

            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <h2>🎛️ 控制面板</h2>
                </div>

                <div className="panel-card action-section">
                    <button className="btn-primary-pop" onClick={() => setShowAddModal(true)} style={{ marginBottom: 10 }}>
                        <Plus size={18} /> 新增挑戰者
                    </button>
                    <button className="btn-secondary-pop" onClick={() => setShowImportModal(true)} style={{ marginBottom: 10 }}>
                        <RefreshCw size={18} /> 匯入鏈上數據
                    </button>
                </div>

                <div className="panel-card queue-section">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h3>⏳ 排隊列表 ({queue.length})</h3>
                        {queue.length > 0 &&
                            <button className="btn-clear" onClick={() => { if (confirm("Clear?")) setQueue([]) }}>清除</button>}
                    </div>
                    <div className="queue-list">
                        {queue.length === 0 ? <div className="empty-state">無玩家</div> : queue.map((p, i) => (
                            <div key={i} className="queue-item">
                                <div className="q-info">
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                                        title="點擊複製地址"
                                        onClick={() => copyToClipboard(p.from)}
                                    >
                                        <span style={{ color: p.nickname ? 'var(--primary)' : 'white' }}>{p.nickname || getShortAddr(p.from)}</span>
                                        <Copy size={12} color="#aaa" />
                                    </div>
                                    <div className="q-amt">{formatNum(p.amount)}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <button className="btn-play-small" style={{ background: '#a29bfe' }} onClick={() => handleEditNickname(i)} title="修改暱稱">
                                        <Edit2 size={12} />
                                    </button>
                                    <button className="btn-play-small" onClick={() => startRound(i)}>開始</button>
                                    <button className="btn-delete-small" onClick={() => {
                                        const n = [...queue]; n.splice(i, 1); setQueue(n);
                                    }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="panel-card rules-section">
                    <h3>📜 遊戲規則</h3>
                    <ul className="rules-list">
                        <RuleItem icon="🔥" title="撞柱 (射中門柱)" desc="賠付 x2 (輸2倍)" color="var(--danger)" />
                        <RuleItem icon="💥" title="三條 (全部相同)" desc="賠付 x3 (輸3倍)" color="var(--danger)" />
                        <RuleItem icon="⚽" title="進球 (範圍內)" desc="贏取獎金 (倍率區間 1.1x - 13x)" color="var(--success)" />
                        <RuleItem icon="❌" title="射歪 (範圍外)" desc="全輸" color="var(--danger)" />
                    </ul>
                </div>
            </aside>

            {/* Modals */}
            {showAddModal && (
                <dialog className="cyber-modal" open>
                    <div className="modal-wrapper">
                        <h3>新增挑戰者</h3>
                        <div className="input-group">
                            <label>錢包地址</label>
                            <input value={modalAddress} onChange={e => setModalAddress(e.target.value)} placeholder="0x..." />
                        </div>
                        <div className="input-group" style={{ marginTop: 10 }}>
                            <label>暱稱 (選填)</label>
                            <input value={modalNickname} onChange={e => setModalNickname(e.target.value)} placeholder="GodTone" />
                        </div>
                        <div className="input-group" style={{ marginTop: 10 }}>
                            <label>金額</label>
                            <input type="number" value={modalAmount} onChange={e => setModalAmount(parseFloat(e.target.value))} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowAddModal(false)}>取消</button>
                            <button className="btn-confirm" onClick={manualAddPlayer}>確認</button>
                        </div>
                    </div>
                </dialog>
            )}

            {showImportModal && (
                <dialog className="cyber-modal" open>
                    <div className="modal-wrapper big-modal">
                        <h3>🔗 鏈上匯入</h3>
                        <div className="input-group">
                            <label>錢包地址 (Host)</label>
                            <input value={importWallet} onChange={e => { setImportWallet(e.target.value); localStorage.setItem('hostWallet', e.target.value); }} />
                        </div>
                        <div className="scan-controls" style={{ marginTop: 10 }}>
                            <button className="btn-action-small" onClick={scanChain}>{scanStatus.includes('掃描') ? '...' : '🔍 掃描'}</button>
                            <span className="status-text">{scanStatus}</span>
                        </div>
                        <div className="scan-results">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>選取</th>
                                        <th>地址</th>
                                        <th>金額</th>
                                        <th>Tx</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scanResults.map((tx) => (
                                        <tr key={tx.hash}>
                                            <td><input type="checkbox" className="import-chk" checked={!!selectedTx[tx.hash]} onChange={() => setSelectedTx(p => ({ ...p, [tx.hash]: !p[tx.hash] }))} /></td>
                                            <td className="addr-col" title={tx.from}>{getShortAddr(tx.from)} <span style={{ color: 'var(--accent)', fontSize: '0.8em' }}>{getNickname(tx.from)}</span></td>
                                            <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatNum(tx.val)}</td>
                                            <td><a href={`https://subnets.avax.network/henesys/tx/${tx.hash}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowImportModal(false)}>取消</button>
                            <button className="btn-confirm" onClick={importSelected}>匯入</button>
                        </div>
                    </div>
                </dialog>
            )}

            {showReplayModal && (
                <dialog className="cyber-modal" open>
                    <div className="modal-wrapper">
                        <h3>🔄 再來一局</h3>
                        <p style={{ marginBottom: 15 }}>玩家: <span style={{ color: 'var(--primary)' }}>{formatAddr(currentPlayer)}</span></p>
                        <div className="input-group">
                            <label>下注金額</label>
                            <input type="number" value={replayAmount} onChange={e => setReplayAmount(parseFloat(e.target.value))} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowReplayModal(false)}>取消</button>
                            <button className="btn-confirm" onClick={replayRound}>確認</button>
                        </div>
                    </div>
                </dialog>
            )}

            {showPayoutModal && (
                <dialog className="cyber-modal" open>
                    <div className="modal-wrapper">
                        <h3>🎉 恭喜 {currentPlayer?.nickname || '玩家'}!</h3>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 15, marginBottom: 20 }}>
                            <div>中獎者: <span style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{currentPlayer?.nickname || getShortAddr(currentPlayer?.from)}</span></div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)', marginTop: 10 }}>{formatNum(finalPayout)} NESO</div>
                        </div>
                        <button className="btn-confirm large" onClick={() => {
                            const text = `🏆 恭喜 ${currentPlayer?.nickname || currentPlayer?.from} 贏得 ${formatNum(finalPayout)} NESO!`;
                            navigator.clipboard.writeText(text);
                            alert("已複製: " + text);
                        }}>📋 複製中獎資訊</button>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowPayoutModal(false)}>關閉</button>
                        </div>
                    </div>
                </dialog>
            )}

            {showPaymentModal && (
                <dialog className="cyber-modal" open>
                    <div className="modal-wrapper">
                        <h3>💸 等待支付</h3>
                        <div style={{ background: 'rgba(255,118,117,0.1)', padding: 15, borderRadius: 15, marginBottom: 20, border: '2px solid var(--danger)' }}>
                            <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: 10 }}>{currentPlayer?.nickname || '玩家'} 輸了!</div>
                            <div>請收取: <span style={{ fontWeight: '900', color: 'white', fontSize: '1.5rem' }}>{formatNum(finalPayout)} NESO</span></div>
                            <div style={{ marginTop: 10, fontSize: '0.9rem', color: '#ccc' }}>原因: {gameMessage}</div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-confirm" onClick={() => setShowPaymentModal(false)}>已確認收款</button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
};

const Card = ({ id, val, isMystery }) => {
    let content = '?';
    let className = 'card';
    if (val !== null) {
        className += ' flip';
        const map = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        content = map[val] || val;
    }
    return (
        <div className={className} id={id}>
            <div className="card-inner">
                <div className={`card-front ${isMystery && !val ? 'mystery' : ''}`}>{isMystery && !val ? '?' : '?'}</div>
                <div className="card-back">{content}</div>
            </div>
        </div>
    );
};

const RuleItem = ({ icon, title, desc, color }) => (
    <li className="rule-item">
        <span className="rule-icon">{icon}</span>
        <div className="rule-content">
            <span className="rule-name">{title}</span>
            <span className="rule-val" style={{ color }}>{desc}</span>
        </div>
    </li>
);

export default StreamerGame;
