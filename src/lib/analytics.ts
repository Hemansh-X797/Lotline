// One typed event layer -> GA4 + PostHog. Consent-gated, first-touch attribution, experiment-aware.
type Props = Record<string, string | number | boolean>;
const GA = import.meta.env.PUBLIC_GA4_ID as string | undefined;
const PH = import.meta.env.PUBLIC_POSTHOG_KEY as string | undefined;
const PH_HOST = (import.meta.env.PUBLIC_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

export const EVENTS = {
  cta_click: ['id'], calc_result: ['pair', 'account_ccy'], copy_result: ['pair'], share_link: ['pair'],
  rate_fallback: ['reason'], faq_open: ['question'], experiment_exposure: ['experiment', 'variant'],
} as const;
export type EventName = keyof typeof EVENTS;

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};
let ready = false, posthog: any = null;
const debug = !GA && !PH;

function firstTouch(): Props {
  const saved = ls.get('ll_ft');
  if (saved) return JSON.parse(saved);
  const q = new URLSearchParams(location.search);
  const ft: Props = { referrer: document.referrer || 'direct' };
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(k => { const v = q.get(k); if (v) ft[k] = v; });
  ls.set('ll_ft', JSON.stringify(ft));
  return ft;
}

export const consent = () => ls.get('ll_consent');
export function setConsent(v: 'granted' | 'denied') { ls.set('ll_consent', v); if (v === 'granted') load(); }

async function load() {
  if (ready || consent() !== 'granted') return;
  ready = true;
  const idle = (window as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 1));
  idle(async () => {
    if (GA) {
      const s = document.createElement('script'); s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`; document.head.appendChild(s);
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = function () { (window as any).dataLayer.push(arguments); };
      (window as any).gtag('js', new Date()); (window as any).gtag('config', GA, { send_page_view: true });
    }
    if (PH) {
      posthog = (await import('posthog-js')).default;
      posthog.init(PH, { api_host: PH_HOST, capture_pageview: true, persistence: 'localStorage+cookie' });
    }
    track('experiment_exposure', { experiment: 'hero', variant: document.documentElement.dataset.hero || 'A' });
  });
}

export function track(name: EventName, props: Props = {}) {
  const missing = EVENTS[name].filter(k => !(k in props)); // data-quality guard
  if (missing.length) { console.warn(`[analytics] ${name} missing`, missing); return; }
  const payload = { ...props, ...firstTouch(), exp_hero: document.documentElement.dataset.hero || 'A',
    event_id: crypto.randomUUID(), path: location.pathname };
  if (debug) console.log('[analytics:debug]', name, payload);
  if (consent() !== 'granted') return;
  if ((window as any).gtag) (window as any).gtag('event', name, payload);
  if (posthog) posthog.capture(name, payload);
}

export function init() {
  firstTouch(); load();
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cta]');
    if (el) track('cta_click', { id: el.dataset.cta! });
  });
}
