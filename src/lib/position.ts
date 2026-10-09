export const PAIRS = ['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','EURGBP','EURJPY','EURCHF','EURAUD','EURCAD','EURNZD','GBPJPY','GBPCHF','GBPAUD','GBPCAD','GBPNZD','AUDJPY','AUDCAD','AUDCHF','AUDNZD','CADJPY','CADCHF','CHFJPY','NZDJPY','NZDCAD','NZDCHF'];
export const ACCOUNT_CCY = ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','INR'];
export const label = (p: string) => `${p.slice(0, 3)}/${p.slice(3)}`;
export const pairInfo = (p: string) => ({ base: p.slice(0, 3), quote: p.slice(3), pip: p.endsWith('JPY') ? 0.01 : 0.0001 });

export interface Input { balance: number; riskPct: number; stopPips: number; pair: string; quoteToAccount: number; rr?: number; entry?: number; leverage?: number }
export type Result = { ok: true; lots: number; units: number; riskAmount: number; actualRisk: number; pipValuePerLot: number; targetPips?: number; reward?: number; margin?: number; warning?: string }
  | { ok: false; error: string };

// Lots are rounded DOWN to 0.01 so actual risk never exceeds the risk you chose.
export function calculate(i: Input): Result {
  const pos = (n: number) => Number.isFinite(n) && n > 0;
  if (!PAIRS.includes(i.pair)) return { ok: false, error: 'Choose a supported pair.' };
  if (!pos(i.balance)) return { ok: false, error: 'Enter an account balance above 0.' };
  if (!pos(i.riskPct) || i.riskPct > 100) return { ok: false, error: 'Enter a risk between 0.01% and 100%.' };
  if (!pos(i.stopPips)) return { ok: false, error: 'Enter a stop loss distance in pips above 0.' };
  if (!pos(i.quoteToAccount)) return { ok: false, error: 'Enter a valid exchange rate.' };
  const { pip } = pairInfo(i.pair);
  const perUnit = pip * i.quoteToAccount;
  const riskAmount = (i.balance * i.riskPct) / 100;
  const units = Math.floor(riskAmount / (i.stopPips * perUnit) / 1000 + 1e-9) * 1000;
  if (units < 1000) return { ok: false, error: `Even the smallest position (0.01 lot) risks more than ${riskAmount.toFixed(2)}. Widen the risk or tighten the stop.` };
  const r: Result = { ok: true, units, lots: units / 100000, riskAmount, actualRisk: units * i.stopPips * perUnit, pipValuePerLot: perUnit * 100000 };
  if (i.riskPct > 5) r.warning = 'Risking more than 5% per trade is very aggressive.';
  if (i.rr && i.rr > 0) { r.targetPips = i.stopPips * i.rr; r.reward = r.actualRisk * i.rr; }
  if (i.entry && i.entry > 0 && i.leverage && i.leverage > 0) r.margin = (units * i.entry * i.quoteToAccount) / i.leverage;
  return r;
}

// Account drawdown after N losses in a row at a fixed % risk, and the gain needed to recover.
export const drawdownTable = (riskPct: number, streaks = [3, 5, 10, 20]) =>
  riskPct > 0 && riskPct < 100 ? streaks.map(n => { const dd = 1 - Math.pow(1 - riskPct / 100, n); return { n, drawdownPct: dd * 100, recoveryPct: (1 / (1 - dd) - 1) * 100 }; }) : [];
export const rateUrl = (quote: string, acct: string) => `https://api.frankfurter.dev/v1/latest?base=${quote}&symbols=${acct}`;
