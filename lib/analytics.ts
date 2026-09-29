/**
 * GA4 event helper.
 * gtag.js ignores plain-object dataLayer pushes ({ event: 'x' }); it only
 * reads `arguments` objects created by gtag(). Everything goes through here.
 */
type Params = Record<string, unknown>;
type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

function send(...args: unknown[]) {
  const w = window as W;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag === 'function') {
    w.gtag(...args);
  } else {
    // gtag.js not ready yet: queue an Arguments object (the format it reads).
    (function (..._a: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    })(...args);
  }
}

export function trackEvent(name: string, params: Params = {}) {
  if (typeof window === 'undefined') return;
  try {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );
    send('event', name, clean);
    // Optional GTM Custom Event trigger (prefixed so it never double-counts).
    (window as W).dataLayer?.push({ event: `sk_${name}`, ...clean });
  } catch {
    /* analytics must never break the site */
  }
}

export function trackClickToCall() {
  trackEvent('click_to_call', { event_category: 'engagement', event_label: 'phone_link' });
}
