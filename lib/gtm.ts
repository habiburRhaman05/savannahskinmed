export function pushGtmEvent(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(payload);
    // eslint-disable-next-line no-console
    console.debug('[GTM] pushed', payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[GTM] push failed', err);
  }
}

export function pushFormStart(details: { formId: string; formName?: string; [k: string]: unknown }) {
  pushGtmEvent({ event: 'form_start', ...details });
}

export function pushFormSubmit(details: { formId: string; formName?: string; [k: string]: unknown }) {
  pushGtmEvent({ event: 'form_submit', ...details });
}
