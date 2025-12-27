function testCurve() {
    const POOL_BONUS_MIN = 1.0;
    const POOL_BONUS_MAX = 5.0; // Boost allow up to 5x

    // Formula Candidates
    // A: 13 / Gap (Linear)
    // B: 13 / Gap^1.2 (Power)
    // C: 13 / Gap^1.5 (Steep)

    console.log("Gap | Linear(Max) | Power1.2(Max) | Power1.5(Max)");

    for (let gap = 1; gap <= 12; gap++) {
        const lin = (13.0 / gap) * 0.90 * POOL_BONUS_MAX;
        const pow12 = (13.0 / Math.pow(gap, 1.2)) * 0.90 * POOL_BONUS_MAX;
        const pow15 = (13.0 / Math.pow(gap, 1.5)) * 0.90 * POOL_BONUS_MAX;

        console.log(`${gap.toString().padEnd(3)} | ${lin.toFixed(2).padEnd(11)} | ${pow12.toFixed(2).padEnd(13)} | ${pow15.toFixed(2)}`);
    }
}
testCurve();
