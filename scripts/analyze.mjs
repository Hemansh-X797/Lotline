// Usage: node scripts/analyze.mjs --a 120/4000 --b 160/4000   (conversions/visitors)
const arg = k => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : null; };
const parse = s => { const [c, n] = (s || '').split('/').map(Number); if (!(n > 0) || c < 0 || c > n) { console.error('Use --a conv/visitors --b conv/visitors'); process.exit(1); } return { c, n, p: c / n }; };
const A = parse(arg('a')), B = parse(arg('b'));
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const cdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
const pool = (A.c + B.c) / (A.n + B.n), se = Math.sqrt(pool * (1 - pool) * (1 / A.n + 1 / B.n));
const z = (B.p - A.p) / se, pv = 2 * (1 - cdf(Math.abs(z)));
const seD = Math.sqrt(A.p * (1 - A.p) / A.n + B.p * (1 - B.p) / B.n), d = B.p - A.p;
const pct = x => (x * 100).toFixed(2) + '%';
console.log(`A: ${pct(A.p)} (${A.c}/${A.n})\nB: ${pct(B.p)} (${B.c}/${B.n})`);
console.log(`Relative lift: ${(d / A.p * 100).toFixed(1)}%  |  Absolute: ${pct(d)}  95% CI: [${pct(d - 1.96 * seD)}, ${pct(d + 1.96 * seD)}]`);
console.log(`z = ${z.toFixed(3)}, two-sided p = ${pv.toFixed(4)}`);
console.log(pv < 0.05 ? 'Result: statistically significant at 95%. Check sample ratio and run length before shipping.' : 'Result: NOT significant. Keep collecting data or call it a tie.');
