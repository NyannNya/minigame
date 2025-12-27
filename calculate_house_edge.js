const C_TOTAL = 13;

function calculateEV() {
    console.log("Simulating Strategy: Min Odds 2.0x, Curve Gap^1.2, Bonus 10x");

    // Check Multiplier Sweep
    // Min Pool: Bonus 1.0
    // Max Pool: Bonus 10.0
    for (let m = 50; m <= 100; m += 5) {
        const multiplier = m / 100.0;
        const evMin = getEV(multiplier, 1.0);
        const evMax = getEV(multiplier, 10.0);

        console.log(`BaseMult ${multiplier.toFixed(2)} | Edge(MinPool): ${(-evMin * 100).toFixed(2)}% | Edge(MaxPool): ${(-evMax * 100).toFixed(2)}%`);
    }
}

function getEV(baseMult, poolBonus) {
    let totalEV = 0;
    let totalHands = 0;

    for (let c1 = 1; c1 <= 13; c1++) {
        for (let c2 = 1; c2 <= 13; c2++) {
            totalHands++;
            let handEV = 0;

            if (c1 === c2) {
                // Pair
                const highCount = 13 - c1;
                const lowCount = c1 - 1;

                let highOdds = 0, lowOdds = 0;
                if (highCount > 0) highOdds = Math.floor((13.0 / highCount) * baseMult * poolBonus * 100) / 100;
                if (lowCount > 0) lowOdds = Math.floor((13.0 / lowCount) * baseMult * poolBonus * 100) / 100;

                // Floor 2.0
                if (highOdds > 0 && highOdds < 2.0) highOdds = 2.0;
                if (lowOdds > 0 && lowOdds < 2.0) lowOdds = 2.0;

                // Choice
                let choice = '';
                if (highCount > lowCount) choice = 'high';
                else if (lowCount > highCount) choice = 'low';
                else choice = 'high';

                let wins = 0, losses = 0, triples = 0;
                for (let c3 = 1; c3 <= 13; c3++) {
                    if (c3 === c1) triples++;
                    else {
                        if (choice === 'high') {
                            if (c3 > c1) wins++; else losses++;
                        } else {
                            if (c3 < c1) wins++; else losses++;
                        }
                    }
                }

                const chosenOdds = choice === 'high' ? highOdds : lowOdds;
                const profit = wins * (chosenOdds - 1);
                const lossCost = losses * 1;
                const tripleCost = triples * 3;

                handEV = (profit - lossCost - tripleCost) / 13;

            } else {
                // Gap
                const gap = Math.abs(c1 - c2) - 1;

                if (gap <= 0) {
                    handEV = -1; // Fold
                } else {
                    // Gap > 0
                    // Curve: Gap^1.2 (Looser/Flatter) + Base 0.90 + Bonus
                    // Max Bonus 10.0x
                    let rawOdds = (13.0 / Math.pow(gap, 1.2)) * baseMult * poolBonus;
                    if (rawOdds < 2.0) rawOdds = 2.0;

                    let odds = Math.floor(rawOdds * 100) / 100;

                    const wins = gap;
                    const posts = 2;
                    const misses = 13 - gap - 2;

                    const playEV = (wins * (odds - 1) + posts * (-2) + misses * (-1)) / 13;

                    if (playEV < -1) handEV = -1;
                    else handEV = playEV;
                }
            }
            totalEV += handEV;
        }
    }
    return totalEV / totalHands;
}

calculateEV();
