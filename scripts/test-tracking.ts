/**
 * Standalone runtime tests for lib/analytics.ts + lib/gtm.ts.
 * Simulates a browser environment (window + dataLayer + mock gtag) and
 * asserts the exact events pushed. Run: npx tsx scripts/test-tracking.ts
 */

type Assertion = { name: string; ok: boolean; detail?: string };

const results: Assertion[] = [];

function assert(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
}

type W = {
  location: { pathname: string };
  dataLayer: unknown[];
  gtag?: (...a: unknown[]) => void;
};

function freshEnv(opts: { withGtag: boolean; path?: string }) {
  const w: W = { location: { pathname: opts.path ?? '/' }, dataLayer: [] };
  if (opts.withGtag) {
    // Mimic gtag.js: a real gtag function that wraps args and reads the queue.
    (w as unknown as { gtag: unknown }).gtag = function gtag(...args: unknown[]) {
      // gtag() queues an Arguments object onto dataLayer
      (function (...inner: unknown[]) {
        w.dataLayer.push(arguments);
      })(...args);
    };
  }
  (globalThis as unknown as { window: W }).window = w;
  return w;
}

function isArguments(v: unknown): v is ArrayLike<unknown> {
  return Object.prototype.toString.call(v) === '[object Arguments]';
}

/** Find queued gtag('event', ...) calls: either Arguments or real gtag output. */
function eventCalls(w: W) {
  return w.dataLayer.filter((entry) => {
    if (isArguments(entry)) {
      return Array.from(entry)[0] === 'event';
    }
    return false;
  });
}

/** Plain objects pushed with a sk_ prefixed event (GTM custom-event trigger). */
function skEvents(w: W) {
  return w.dataLayer.filter(
    (e) => e && typeof e === 'object' && !isArguments(e) && typeof (e as { event?: unknown }).event === 'string' && String((e as { event?: unknown }).event).startsWith('sk_'),
  );
}

function eventFromArgs(a: ArrayLike<unknown>) {
  const arr = Array.from(a);
  return { name: arr[1] as string, params: (arr[2] ?? {}) as Record<string, unknown> };
}

async function main() {
  const { trackEvent, trackClickToCall } = await import('../lib/analytics');
  const gtm = await import('../lib/gtm');

  // ---------- 1. trackEvent with gtag.js present ----------
  {
    const w = freshEnv({ withGtag: true });
    trackEvent('form_submit', { form_id: 'contact_form', form_name: 'Contact Form', page_path: '/contact' });
    const calls = eventCalls(w).map((a) => eventFromArgs(a as ArrayLike<unknown>));
    assert('trackEvent -> gtag("event", ...) called when gtag.js present', calls.length === 1, `got ${calls.length} calls`);
    assert('trackEvent event name correct', calls[0]?.name === 'form_submit', JSON.stringify(calls[0]));
    assert(
      'trackEvent params correct',
      calls[0]?.params.form_id === 'contact_form' && calls[0]?.params.page_path === '/contact',
      JSON.stringify(calls[0]?.params),
    );
    // Also the sk_ GTM trigger should be pushed as a plain object
    const sk = skEvents(w);
    assert('trackEvent pushes sk_ GTM custom event too', sk.length === 1 && (sk[0] as { event: string }).event === 'sk_form_submit', JSON.stringify(sk));
    assert('sk_ push does NOT use bare form_submit (no double count)', !w.dataLayer.some((e) => e && typeof e === 'object' && !isArguments(e) && (e as { event?: unknown }).event === 'form_submit'));
  }

  // ---------- 2. trackEvent queues Arguments when gtag.js NOT ready ----------
  {
    const w = freshEnv({ withGtag: false });
    trackEvent('form_start', { form_id: 'booking_modal' });
    const queued = w.dataLayer.filter((e) => isArguments(e));
    assert('trackEvent queues Arguments object when gtag.js not loaded', queued.length === 1, `got ${queued.length}`);
    const first = queued[0] ? Array.from(queued[0] as ArrayLike<unknown>) : [];
    assert('queued Arguments format matches gtag spec', first[0] === 'event' && first[1] === 'form_start', JSON.stringify(first));
  }

  // ---------- 3. Empty/undefined params are stripped ----------
  {
    const w = freshEnv({ withGtag: true });
    trackEvent('test_strip', { keep: 'x', dropEmpty: '', dropUndef: undefined });
    const call = eventCalls(w).map((a) => eventFromArgs(a as ArrayLike<unknown>))[0];
    assert('undefined/empty params stripped', call && !('dropEmpty' in call.params) && !('dropUndef' in call.params) && call.params.keep === 'x', JSON.stringify(call?.params));
  }

  // ---------- 4. pushFormSubmit -> form_submit + generate_lead ----------
  {
    const w = freshEnv({ withGtag: true });
    gtm.pushFormSubmit({ formId: 'booking_modal', formName: 'Book Appointment', page_path: '/book' });
    const names = eventCalls(w).map((a) => eventFromArgs(a as ArrayLike<unknown>).name);
    assert('pushFormSubmit fires form_submit', names.includes('form_submit'), JSON.stringify(names));
    assert('pushFormSubmit fires generate_lead (key event)', names.includes('generate_lead'), JSON.stringify(names));
    assert('no PII in submit params', eventCalls(w).every((a) => {
      const p = JSON.stringify(eventFromArgs(a as ArrayLike<unknown>).params);
      return !p.includes('name:') && !p.includes('email') && !p.includes('phone');
    }));
  }

  // ---------- 5. pushFormStart dedupe within 10s ----------
  {
    const w = freshEnv({ withGtag: true });
    gtm.pushFormStart({ formId: 'claim_modal', formName: 'Claim Aesthetic Special', page_path: '/specials' });
    gtm.pushFormStart({ formId: 'claim_modal', formName: 'Claim Aesthetic Special', page_path: '/specials' });
    gtm.pushFormStart({ formId: 'claim_modal', formName: 'Claim Aesthetic Special', page_path: '/specials' });
    const starts = eventCalls(w).filter((a) => eventFromArgs(a as ArrayLike<unknown>).name === 'form_start');
    assert('pushFormStart deduped (3 rapid calls -> 1 event)', starts.length === 1, `got ${starts.length}`);
    // After a successful submit the dedupe map is cleared -> next start fires again
    gtm.pushFormSubmit({ formId: 'claim_modal', formName: 'Claim Aesthetic Special', page_path: '/specials' });
    gtm.pushFormStart({ formId: 'claim_modal', formName: 'Claim Aesthetic Special', page_path: '/specials' });
    const startsAfter = eventCalls(w).filter((a) => eventFromArgs(a as ArrayLike<unknown>).name === 'form_start');
    assert('form_start fires again after submit (dedupe reset)', startsAfter.length === 2, `got ${startsAfter.length}`);
  }

  // ---------- 6. Admin paths are blocked ----------
  {
    const w = freshEnv({ withGtag: true, path: '/admin/dashboard/content/blog' });
    gtm.pushFormStart({ formId: 'x', formName: 'X', page_path: '/admin/dashboard/content/blog' });
    gtm.pushFormSubmit({ formId: 'x', formName: 'X', page_path: '/admin/dashboard/content/blog' });
    gtm.pushGtmEvent({ event: 'page_view' });
    assert('no tracking events on /admin paths', eventCalls(w).length === 0, `got ${eventCalls(w).length} calls`);
  }

  // ---------- 7. pushGtmEvent backwards compat ----------
  {
    const w = freshEnv({ withGtag: true });
    gtm.pushGtmEvent({ event: 'phone_click', label: 'header' });
    const call = eventCalls(w).map((a) => eventFromArgs(a as ArrayLike<unknown>))[0];
    assert('pushGtmEvent still works (back-compat)', call?.name === 'phone_call' || call?.name === 'phone_click', JSON.stringify(call));
  }

  // ---------- 8. trackClickToCall ----------
  {
    const w = freshEnv({ withGtag: true });
    trackClickToCall();
    const call = eventCalls(w).map((a) => eventFromArgs(a as ArrayLike<unknown>))[0];
    assert('trackClickToCall fires click_to_call', call?.name === 'click_to_call', JSON.stringify(call));
  }

  // ---------- 9. No throw when window undefined (SSR safety) ----------
  {
    delete (globalThis as unknown as { window?: W }).window;
    let threw = false;
    try {
      trackEvent('ssr_test');
      gtm.pushFormStart({ formId: 'x' });
      gtm.pushFormSubmit({ formId: 'x' });
    } catch {
      threw = true;
    }
    assert('no throw on server (window undefined)', !threw);
    freshEnv({ withGtag: true }); // restore for any later use
  }

  // ---------- 10. No throw when dataLayer missing entirely (edge case) ----------
  {
    const w = freshEnv({ withGtag: true });
    delete (w as { dataLayer?: unknown[] }).dataLayer; // simulate script order weirdness
    let threw = false;
    try {
      trackEvent('edge_case');
    } catch {
      threw = true;
    }
    assert('no throw when dataLayer is missing', !threw);
  }

  // ---------- report ----------
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.ok ? `  (${r.detail})` : ''}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
