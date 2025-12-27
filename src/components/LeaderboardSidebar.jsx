import React from 'react';
import { Undo2 } from 'lucide-react';

const LeaderboardSidebar = ({ leaderboard, nicknameMap, onReturnToQueue }) => {

    // Helper to format address if no nickname
    const formatName = (addr) => {
        if (nicknameMap && nicknameMap[addr]) return nicknameMap[addr];
        if (!addr) return "Unknown";
        return addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
    };

    return (
        <aside className="leaderboard-sidebar">
            <div className="sidebar-header" style={{ marginBottom: 20 }}>
                <h2>🏆 排行榜</h2>
            </div>
            <div className="leaderboard-list">
                {Object.entries(leaderboard)
                    .sort(([, a], [, b]) => {
                        // Sort by Payout (desc)
                        const valA = typeof a === 'number' ? a : a.payout;
                        const valB = typeof b === 'number' ? b : b.payout;
                        return valB - valA;
                    })
                    .map(([addr, val], i) => {
                        // Handle legacy number format
                        const payout = typeof val === 'number' ? val : val.payout;
                        const wins = typeof val === 'number' ? 0 : val.wins;
                        const rounds = typeof val === 'number' ? 0 : val.rounds;
                        const winRate = rounds > 0 ? Math.round((wins / rounds) * 100) : 0;

                        return (
                            <div key={addr} className="leaderboard-item" style={{ position: 'relative' }}>
                                <span className={`rank-num rank-${i + 1}`}>{i + 1}</span>
                                <div className="lb-info">
                                    <div className="lb-name">
                                        {formatName(addr)}
                                    </div>
                                    <div className="lb-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div className="lb-amount">${Math.floor(payout).toLocaleString()}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="lb-rate" style={{ fontSize: '0.8rem', color: '#a29bfe' }}>
                                                勝率: {winRate}%
                                            </div>
                                            {onReturnToQueue && (
                                                <button
                                                    className="btn-icon-small"
                                                    onClick={() => onReturnToQueue(addr)}
                                                    title="領回獎金至排隊列表"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        width: 24,
                                                        height: 24,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        borderRadius: 4
                                                    }}
                                                >
                                                    <Undo2 size={14} color="#fab1a0" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                {Object.keys(leaderboard).length === 0 && (
                    <div className="no-data">尚無紀錄</div>
                )}
            </div>
        </aside>
    );
};

export default LeaderboardSidebar;
