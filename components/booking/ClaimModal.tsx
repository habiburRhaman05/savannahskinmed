'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CloseIcon } from '@/components/icons';
import { submitClaim } from '@/app/actions/submissions';
import { pushFormStart, pushFormSubmit } from '@/lib/gtm';

type ClaimModalProps = {
  open: boolean;
  onClose: () => void;
  offerId?: string;
  offerLabel?: string;
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
        className="w-full rounded-lg border border-white/45 bg-transparent px-6 py-[18px] font-sans text-[16px] text-white outline-none transition placeholder:text-white/90 focus:border-white focus:bg-white/10"
      />
    </div>
  );
}

export default function ClaimModal({ open, onClose, offerId, offerLabel }: ClaimModalProps) {
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
          formId: 'claim_modal',
          formName: 'Claim Aesthetic Special',
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
    if (offerId) formData.set('offerId', offerId);
    if (offerLabel) formData.set('offerLabel', offerLabel);

    const result = await submitClaim(formData);
    setSubmitting(false);

    if (result.ok) {
      console.debug('[Claim] successful submit; pushing form_submit');
      pushFormSubmit({
        formId: 'claim_modal',
        formName: 'Claim Aesthetic Special',
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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-md sm:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative w-full max-w-[600px] rounded-2xl bg-navy px-6 pb-12 pt-16 shadow-menu sm:px-14"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <h2 id="booking-title" className="display-3 text-center text-white">
          Claim Aesthetic Special
        </h2>

        {sent ? (
          <div className="mt-10 text-center">
            <p className="text-[16px] leading-[1.8] text-white">
              Thank you — your claim request has been received. Our team will contact you shortly to confirm your special offer.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 w-full rounded-full bg-teal px-8 py-[19px] font-sans text-[14px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark"
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
                  formId: 'claim_modal',
                  formName: 'Claim Aesthetic Special',
                  page_path: window.location.pathname,
                  page_url: window.location.href,
                });
                setHasStarted(true);
              }
            }}
            className="mt-9 space-y-4"
          >
            <Field id="name" label="Name" autoComplete="name" />
            <Field id="email" label="E-mail Address" type="email" autoComplete="email" />
            <Field id="phone" label="Phone" type="tel" autoComplete="tel" />

            {error && (
              <p role="alert" className="text-[13px] text-rose-light">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="!mt-8 w-full rounded-full bg-teal px-8 py-[19px] font-sans text-[15px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-teal-dark disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Next Step'}
            </button>
          </form>
        )}

        <hr className="mt-12 border-white/25" />

        <p className="mt-8 text-[9px] uppercase leading-relaxed tracking-widest text-white/50">
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
