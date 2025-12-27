import React from 'react';

const LeaderboardSidebar = ({ leaderboard, nicknameMap }) => {

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
                            <div key={addr} className="leaderboard-item">
                                <span className={`rank-num rank-${i + 1}`}>{i + 1}</span>
                                <div className="lb-info">
                                    <div className="lb-name">
                                        {formatName(addr)}
                                    </div>
                                    <div className="lb-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div className="lb-amount">${Math.floor(payout).toLocaleString()}</div>
                                        <div className="lb-rate" style={{ fontSize: '0.8rem', color: '#a29bfe' }}>
                                            勝率: {winRate}%
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
