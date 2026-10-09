import { describe, it, expect } from 'vitest';
import { calculate, drawdownTable } from './position';
const base = { balance: 10000, riskPct: 1, stopPips: 20, pair: 'EURUSD', quoteToAccount: 1 };
describe('calculate', () => {
  it('EURUSD, USD account: 1% of 10k, 20 pips = 0.5 lot', () => {
    const r = calculate(base); if (!r.ok) throw 0;
    expect(r.lots).toBe(0.5); expect(r.units).toBe(50000); expect(r.pipValuePerLot).toBeCloseTo(10); expect(r.actualRisk).toBeCloseTo(100);
  });
  it('USDJPY uses 0.01 pip and converts JPY to account', () => {
    const r = calculate({ ...base, pair: 'USDJPY', stopPips: 50, quoteToAccount: 0.0065 }); if (!r.ok) throw 0;
    expect(r.lots).toBe(0.3); expect(r.actualRisk).toBeLessThanOrEqual(100);
  });
  it('never exceeds the chosen risk', () => {
    const r = calculate({ ...base, stopPips: 33, quoteToAccount: 0.79 }); if (!r.ok) throw 0;
    expect(r.actualRisk).toBeLessThanOrEqual(r.riskAmount + 1e-9);
  });
  it('adds reward from risk:reward', () => {
    const r = calculate({ ...base, rr: 2 }); if (!r.ok) throw 0;
    expect(r.targetPips).toBe(40); expect(r.reward).toBeCloseTo(200);
  });
  it('rejects bad input and too-small risk', () => {
    expect(calculate({ ...base, balance: 0 }).ok).toBe(false);
    expect(calculate({ ...base, riskPct: 101 }).ok).toBe(false);
    expect(calculate({ ...base, stopPips: -5 }).ok).toBe(false);
    expect(calculate({ ...base, balance: 50, stopPips: 200 }).ok).toBe(false);
  });
  it('warns above 5% risk', () => {
    const r = calculate({ ...base, riskPct: 6 }); if (!r.ok) throw 0; expect(r.warning).toBeTruthy();
  });
});

describe('margin and drawdown', () => {
  it('margin = notional / leverage', () => {
    const r = calculate({ ...base, entry: 1.1, leverage: 30 }); if (!r.ok) throw 0;
    expect(r.margin).toBeCloseTo(1833.33, 1);
  });
  it('no margin without entry or leverage', () => {
    const r = calculate(base); if (!r.ok) throw 0; expect(r.margin).toBeUndefined();
  });
  it('10 losses at 1% = 9.56% drawdown, 10.57% to recover', () => {
    const t = drawdownTable(1).find(x => x.n === 10)!;
    expect(t.drawdownPct).toBeCloseTo(9.562, 2); expect(t.recoveryPct).toBeCloseTo(10.57, 1);
  });
  it('returns nothing for invalid risk', () => { expect(drawdownTable(100)).toEqual([]); expect(drawdownTable(0)).toEqual([]); });
});
