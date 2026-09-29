'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CloseIcon } from '@/components/icons';
import { footerServices } from '@/lib/site';
import { submitBooking } from '@/app/actions/submissions';
import { pushFormStart, pushFormSubmit } from '@/lib/gtm';

const LOCATIONS = ['Pooler / Savannah', 'Statesboro'];

const HIGHLEVEL_WEBHOOK_URL =
  'https://services.leadconnectorhq.com/hooks/TCgWNSOqArBjmBL22qrU/webhook-trigger/92b8b77f-2205-41e5-b434-459a7829b9d0';

const PAGE_TAGS: Record<string, string> = {
  // '/': 'homepage',
  // '/services/hormone-therapy': 'hormone-therapy',
  // '/services/weight-management': 'weight-management',
  // '/services/iv-therapy': 'iv-therapy',
};

type BookingModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={label}
        required
        className="w-full rounded-lg border border-white/45 bg-transparent px-3 py-2 font-sans text-[13px] text-white outline-none transition placeholder:text-white/60 sm:px-4 sm:py-3 sm:text-[16px]"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="relative rounded-lg border border-white/45 pb-1 pl-3 pr-4 pt-1 transition focus-within:border-white sm:pb-2 sm:pl-4 sm:pt-1.5">
      <label
        htmlFor={id}
        className="block font-sans text-[10px] font-extrabold uppercase tracking-[0.03em] text-white sm:text-[11px]"
      >
        {label}
      </label>

      <select
        id={id}
        name={id}
        required
        defaultValue={placeholder ? '' : options[0]}
        className="w-full appearance-none bg-transparent pr-6 font-sans text-[13px] text-white outline-none sm:text-[16px]"
      >
        {placeholder && (
          <option value="" className="bg-navy text-white">
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option key={option} value={option} className="bg-navy text-white">
            {option}
          </option>
        ))}
      </select>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 right-3 border-x-[5px] border-t-[6px] border-x-transparent border-t-white sm:bottom-2.5 sm:right-4"
      />
    </div>
  );
}

export default function BookingModal({
  open,
  onClose,
  title,
}: BookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepOneData, setStepOneData] = useState<FormData | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSent(false);
      setError(null);
      setStepOneData(null);
      setHasStarted(false);
      return;
    }

    pushFormStart({
      formId: 'booking_modal',
      formName: 'Book Appointment',
      page_path: window.location.pathname,
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
    });
    setHasStarted(true);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href]',
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const getPageTag = () => {
    const pathname =
      window.location.pathname.replace(/\/$/, '') || '/';

    return PAGE_TAGS[pathname] || null;
  };

  const handleFormFocusCapture = () => {
    if (hasStarted) return;
    pushFormStart({
      formId: 'booking_modal',
      formName: 'Book Appointment',
      page_path: window.location.pathname,
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
    });
    setHasStarted(true);
  };

  const sendToHighLevel = async (data: FormData) => {
    const pageTag = getPageTag();
    const tags = 'website-leads';

    const payload = {
      name: String(data.get('name') || ''),
      email: String(data.get('email') || ''),
      phone: String(data.get('phone') || ''),
      location: String(data.get('location') || ''),
      service: String(data.get('service') || ''),
      website: 'savannahskinmed',
      website_name: 'savannahskinmed',
      website_domain: 'savannahskinmed.com',
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer_url: document.referrer || '',
      source: 'Age Management Website',
      source_type: 'website',
      form_name: 'Book Appointment',
      form_type: 'appointment_request',
      tag: pageTag ? `${tags},${pageTag}` : tags,
      lead_source: 'website',
      lead_source_detail: 'booking_modal',
      user_agent: navigator.userAgent,
      language: navigator.language || '',
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      submitted_at: new Date().toISOString(),
    };

    try {
      const response = await fetch(HIGHLEVEL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      console.log('[HighLevel] Webhook response:', {
        status: response.status,
        ok: response.ok,
        response: responseText,
        payload,
      });

      if (!response.ok) {
        console.error(
          '[HighLevel] Webhook returned an error:',
          response.status,
          responseText,
        );
      }
    } catch (webhookError) {
      console.error('[HighLevel] Webhook request failed:', webhookError);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    setError(null);
    setSubmitting(true);

    try {
      const result = await submitBooking(data);

      if (!result.ok) {
        setSubmitting(false);
        setError(result.error);
        return;
      }

      console.debug('[Booking] successful submit; pushing form_submit');
      pushFormSubmit({
        formId: 'booking_modal',
        formName: 'Book Appointment',
        page_path: window.location.pathname,
        page_url: window.location.href,
        submitted_at: new Date().toISOString(),
      });

      await sendToHighLevel(data);

      setSubmitting(false);
      setSent(true);
    } catch (submitError) {
      console.error('[Booking] Submission error:', submitError);
      setSubmitting(false);
      setError(
        'Something went wrong while submitting your request. Please try again.',
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-4 backdrop-blur-md sm:py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative w-full max-w-[600px] rounded-2xl bg-[#14214B] px-4 pb-4 pt-6 shadow-menu sm:px-10 sm:pb-8 sm:pt-10"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close booking form"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 sm:right-5 sm:top-5 sm:h-10 sm:w-10"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <h2
          id="booking-title"
          className="display-3 text-center text-[20px] text-white sm:text-[26px] lg:text-[30px]"
        >
          {title || 'Book Appointment'}
        </h2>

        {sent ? (
          <div className="mt-6 text-center">
            <p className="text-[16px] leading-[1.8] text-white">
              Thank you — your request has been received. Our team will contact you shortly to confirm your appointment.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-teal px-8 py-3 font-sans text-[14px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark sm:py-4"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            onFocusCapture={handleFormFocusCapture}
            className="mt-2 space-y-1 sm:mt-4 sm:space-y-2"
          >
            <div className="space-y-3 sm:space-y-4">
              <Field id="name" label="Name" autoComplete="name" />
              <Field id="email" label="E-mail Address" type="email" autoComplete="email" />
              <Field id="phone" label="Phone" type="tel" autoComplete="tel" />

              <SelectField
                id="location"
                label="Which location are you interested in?"
                options={LOCATIONS}
              />

              <SelectField
                id="service"
                label="Service:"
                placeholder="Choose A Service"
                options={footerServices.map((service) => service.label)}
              />
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-rose-light">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="!mt-3 w-full rounded-full bg-teal px-8 py-2.5 font-sans text-[13px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark sm:!mt-4 sm:py-3.5 sm:text-[15px]"
            >
              {submitting ? 'Sending…' : 'Next Step'}
            </button>
          </form>
        )}

        <hr className="mt-8 border-white/25" />

        <p className="mt-4 font-sans text-[10px] uppercase leading-[1.10] tracking-[0.01em] text-white/70">
          By completing and submitting this form, I hereby provide explicit written consent to
          receive communications through text messages and phone calls, including those to
          wireless numbers or numbers registered on an internal do not call registry. I
          acknowledge that these communications may be initiated through telephone calls,
          prerecorded voicemails, or postal mail, and may pertain to marketing services. I
          understand that such communications might involve automated software. Additionally, I
          affirm my understanding and acceptance of the privacy policy and terms and conditions. I
          am aware that I can opt out of these communications at any time by replying with
          &ldquo;stop&rdquo;. Standard message and data rates may apply.
        </p>
      </div>
    </div>,
    document.body,
  );
}
