'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';

import Reveal from '@/components/ui/Reveal';
import { submitContact } from '@/app/actions/submissions';
import { pushFormStart, pushFormSubmit } from '@/lib/gtm';

const fields = [
  { name: 'firstName', placeholder: 'First Name', type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', placeholder: 'Last Name', type: 'text', autoComplete: 'family-name' },
  { name: 'phone', placeholder: 'Phone', type: 'tel', autoComplete: 'tel' },
  { name: 'email', placeholder: 'Email', type: 'email', autoComplete: 'email' },
] as const;

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = event.currentTarget;
    const result = await submitContact(new FormData(form));
    setSubmitting(false);

    if (result.ok) {
      console.debug('[Contact] successful submit; pushing form_submit');
      pushFormSubmit({
        formId: 'contact_form',
        formName: 'Contact Form',
        page_path: window.location.pathname,
        page_url: window.location.href,
        submitted_at: new Date().toISOString(),
      });
      setSent(true);
      form.reset();
      return;
    }

    setError(result.error);
  };

  return (
    <section>
      <div className="shell">
        <div className="relative overflow-hidden rounded-[26px] bg-rose px-6 py-14 sm:px-10 lg:px-16 lg:py-[96px]">
          <Image
            src="/images/contact-bg.jpg"
            alt=""
            fill
            sizes="(max-width: 1600px) 100vw, 1520px"
            className="object-cover"
            aria-hidden="true"
          />

          <Reveal className="relative z-10 mx-auto max-w-[680px] text-center">
            <h2 className="display-1v2 text-white">Get In Touch With Us!</h2>

            <p className="mx-auto mt-5 max-w-[600px] text-[20px] leading-[1.85] text-white/95">
              We&rsquo;re here to answer your questions, address your concerns, and help you take
              the first step toward better health and wellness. Reach out to us today!
            </p>

            <form
              onSubmit={handleSubmit}
              onFocusCapture={() => {
                if (hasStarted) return;
                pushFormStart({
                  formId: 'contact_form',
                  formName: 'Contact Form',
                  page_path: window.location.pathname,
                  page_url: window.location.href,
                });
                setHasStarted(true);
              }}
              className="mt-12 text-left"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="sr-only">
                      {field.placeholder}
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      required
                      className="field"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <label htmlFor="message" className="sr-only">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Message"
                  required
                  className="field resize-y"
                />
              </div>

              <div className="mt-9 flex flex-col items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-navy px-10 py-[15px] font-sans text-[11px] font-medium uppercase tracking-widest2 text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Submit'}
                </button>

                {error && (
                  <p role="alert" className="text-[14px] text-white">
                    {error}
                  </p>
                )}

                {sent && (
                  <p role="status" className="text-[14px] text-white">
                    Thank you — we&rsquo;ve received your message and will be in touch shortly.
                  </p>
                )}
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
