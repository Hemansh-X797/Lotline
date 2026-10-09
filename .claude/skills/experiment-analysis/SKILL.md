---
name: experiment-analysis
description: Analyze an A/B test on the Lotline hero experiment. Use when asked to check experiment results, decide a winner, or review conversion data from PostHog or GA4.
---
# Experiment analysis
1. Get visitors and conversions per variant (A, B) for the `hero` experiment, using `exp_hero` on events and the `experiment_exposure` event as the denominator. Primary metric: `calc_result` per exposed visitor.
2. Check data quality first: split near 50/50 (flag a sample ratio mismatch if it deviates by more than about 1 percentage point on large samples), no duplicate `event_id`, no traffic outside the test window.
3. Run `node scripts/analyze.mjs --a <conv>/<visitors> --b <conv>/<visitors>`.
4. Report: rates, relative lift, 95% CI, p-value, a plain-language call (ship B, keep A, or keep running), and one risk to check (novelty effect, one traffic source skewing results). Never call a winner from a non-significant result.
