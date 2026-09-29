'use client';

import { createContext, useContext, useRef, useState, useTransition } from 'react';

import { alertError, alertSuccess } from '@/lib/adminAlerts';
import { pushFormStart, pushFormSubmit } from '@/lib/gtm';

type Props = {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  className?: string;
  children: React.ReactNode;
};

const PendingContext = createContext(false);

export function usePendingForm() {
  return useContext(PendingContext);
}

export default function AddInlineForm({ action, successMessage, className, children }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [hasStarted, setHasStarted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
        formRef.current?.reset();
        console.debug('[Admin Form] successful submit; pushing form_submit');
        pushFormSubmit({
          formId: 'admin_inline_form',
          formName: successMessage,
          page_path: window.location.pathname,
          page_url: window.location.href,
          submitted_at: new Date().toISOString(),
        });
        await alertSuccess(successMessage);
      } catch (err) {
        await alertError('Something went wrong', err instanceof Error ? err.message : undefined);
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onFocusCapture={() => {
        if (hasStarted) return;
        pushFormStart({
          formId: 'admin_inline_form',
          formName: successMessage,
          page_path: window.location.pathname,
          page_url: window.location.href,
          submitted_at: new Date().toISOString(),
        });
        setHasStarted(true);
      }}
      className={className}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}
