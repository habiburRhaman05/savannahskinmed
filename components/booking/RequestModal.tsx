'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CloseIcon } from '@/components/icons';
import { submitMembershipRequest } from '@/app/actions/submissions';
import { pushFormStart, pushFormSubmit } from '@/lib/gtm';

const LOCATIONS = ['Pooler / Savannah', 'Statesboro'];

type RequestModalProps = {
  open: boolean;
  onClose: () => void;
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
        className="w-full rounded-lg border border-white/45 bg-transparent px-5 py-3 font-sans text-[16px] text-white outline-none transition placeholder:text-white/90 focus:border-white focus:bg-white/10"
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
    <div className="relative rounded-lg border border-white/45 px-5 pb-2 pt-1.5 transition focus-within:border-white">
      <label
        htmlFor={id}
        className="block font-sans text-[11px] font-extrabold uppercase tracking-[0.03em] text-white"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        required
        defaultValue={placeholder ? '' : options[0]}
        className="w-full appearance-none bg-transparent pr-6 font-sans text-[16px] text-white outline-none"
      >
        {placeholder && (
          <option value="" className="bg-navy text-white">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-navy text-white">
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute bottom-0 right-5 top-0 flex items-center pt-2.5 text-white">
        <svg width="10" height="6" fill="none" viewBox="0 0 10 6">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </div>
    </div>
  );
}

export default function RequestModal({ open, onClose }: RequestModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      closeRef.current?.focus();
      if (!hasStarted) {
        pushFormStart({
          formId: 'request_modal',
          formName: 'Membership Request',
          page_path: window.location.pathname,
          page_url: window.location.href,
        });
        setHasStarted(true);
      }
    } else {
      document.body.style.overflow = '';
      setHasStarted(false);
      setTimeout(() => {
        setSent(false);
        setError(null);
      }, 300);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, hasStarted]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await submitMembershipRequest(formData);
    setSubmitting(false);

    if (result.ok) {
      console.debug('[Request] successful submit; pushing form_submit');
      pushFormSubmit({
        formId: 'request_modal',
        formName: 'Membership Request',
        page_path: window.location.pathname,
        page_url: window.location.href,
        submitted_at: new Date().toISOString(),
      });
      setSent(true);
      return;
    }

    setError(result.error);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-screen flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-md sm:py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative w-full max-w-[600px] my-auto rounded-2xl bg-navy px-5 pb-8 pt-10 shadow-menu sm:px-12"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <h2 id="booking-title" className="display-3 text-center text-white">
          Request Details
        </h2>

        {sent ? (
          <div className="mt-8 text-center">
            <p className="text-[16px] leading-[1.8] text-white">
              Thank you — your request has been received. Our team will contact you shortly to provide more details.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-teal px-8 py-[17px] font-sans text-[14px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            onFocusCapture={() => {
              if (!hasStarted) {
                pushFormStart({
                  formId: 'request_modal',
                  formName: 'Membership Request',
                  page_path: window.location.pathname,
                  page_url: window.location.href,
                });
                setHasStarted(true);
              }
            }}
            className="mt-7 space-y-3"
          >
            <Field id="name" label="Name" autoComplete="name" />
            <Field id="email" label="E-mail Address" type="email" autoComplete="email" />
            <Field id="phone" label="Phone" type="tel" autoComplete="tel" />

            <SelectField
              id="location"
              label="Which location are you interested in?"
              options={LOCATIONS}
            />

            <div>
              <label htmlFor="message" className="sr-only">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                placeholder="Message"
                className="w-full resize-y rounded-lg border border-white/45 bg-transparent px-5 py-3 font-sans text-[16px] text-white outline-none transition placeholder:text-white/90 focus:border-white focus:bg-white/10"
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
              className="!mt-6 w-full rounded-full bg-teal px-8 py-[17px] font-sans text-[15px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Next Step'}
            </button>
          </form>
        )}

        <hr className="mt-8 border-white/25" />

        <p className="mt-5 text-[9px] uppercase leading-relaxed tracking-widest text-white/50">
          BY COMPLETING AND SUBMITTING THIS FORM, I HEREBY PROVIDE EXPLICIT WRITTEN CONSENT TO
          RECEIVE COMMUNICATIONS THROUGH TEXT MESSAGES AND PHONE CALLS, INCLUDING THOSE TO WIRELESS
          NUMBERS OR NUMBERS REGISTERED ON AN INTERNAL DO NOT CALL REGISTRY. I ACKNOWLEDGE THAT
          THESE COMMUNICATIONS MAY BE INITIATED THROUGH TELEPHONE CALLS, PRERECORDED VOICEMAILS, OR
          POSTAL MAIL, AND MAY PERTAIN TO MARKETING SERVICES. I UNDERSTAND THAT SUCH COMMUNICATIONS
          MIGHT INVOLVE AUTOMATED SOFTWARE. ADDITIONALLY, I AFFIRM MY UNDERSTANDING AND ACCEPTANCE
          OF THE PRIVACY POLICY AND TERMS AND CONDITIONS. I AM AWARE THAT I CAN OPT OUT OF THESE
          COMMUNICATIONS AT ANY TIME BY REPLYING WITH &quot;STOP&quot;. STANDARD MESSAGE AND DATA
          RATES MAY APPLY.
        </p>
      </div>
    </div>,
    document.body,
  );
}
