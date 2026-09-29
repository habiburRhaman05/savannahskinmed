// Drop-in replacement: same exports/signatures the form components already use,
// but events now reach GA4 via gtag('event', ...) instead of plain dataLayer objects.
import { trackEvent } from '@/lib/analytics';

type Details = { formId: string; formName?: string; [k: string]: unknown };

const lastStart = new Map<string, number>();
const START_DEDUPE_MS = 10_000;

// Never send tracking for the admin dashboard.
const isAdmin = () => window.location.pathname.startsWith('/admin');

/** Kept for backwards compatibility. */
export function pushGtmEvent(payload: Record<string, unknown>) {
  if (typeof window === 'undefined' || isAdmin()) return;
  const { event, ...rest } = payload as { event?: string };
  if (event) trackEvent(event, rest);
}

export function pushFormStart(d: Details) {
  if (typeof window === 'undefined' || isAdmin()) return;
  const now = Date.now();
  if (now - (lastStart.get(d.formId) ?? 0) < START_DEDUPE_MS) return; // stops repeat firing
  lastStart.set(d.formId, now);
  trackEvent('form_start', { form_id: d.formId, form_name: d.formName, page_path: d.page_path });
}

export function pushFormSubmit(d: Details) {
  if (typeof window === 'undefined' || isAdmin()) return;
  lastStart.delete(d.formId);
  const p = { form_id: d.formId, form_name: d.formName, page_path: d.page_path };
  trackEvent('form_submit', p);
  trackEvent('generate_lead', p); // mark as Key event in GA4
}
