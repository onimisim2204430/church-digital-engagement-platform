/**
 * ContactPage — Public contact form page
 *
 * Features:
 * - Authenticated users: name/email auto-filled and editable
 * - Unauthenticated users: manual entry
 * - Category selection for routing to the right team
 * - Sends to admin via backend email service
 */

import React, { memo, useState, useEffect } from 'react';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';
import { useAuth } from '../auth/AuthContext';
import contactService, {
  CONTACT_CATEGORIES,
  ContactCategory,
  ContactSubmitPayload,
} from '../services/contact.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = Omit<ContactSubmitPayload, 'consent'> & { consent: boolean };

const INITIAL_FORM: FormState = {
  sender_name: '',
  sender_email: '',
  sender_phone: '',
  category: 'GENERAL',
  subject: '',
  message: '',
  preferred_contact: 'email',
  consent: false,
};

const PREFERRED_CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldError: React.FC<{ error?: string }> = ({ error }) =>
  error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

// ─── Main Component ───────────────────────────────────────────────────────────

const ContactPage: React.FC = memo(() => {
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  // Auto-fill from AuthContext when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setForm((prev) => ({
        ...prev,
        sender_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.sender_name,
        sender_email: user.email || prev.sender_email,
      }));
    }
  }, [isAuthenticated, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError('');
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.sender_name.trim()) newErrors.sender_name = 'Name is required.';
    if (!form.sender_email.trim()) {
      newErrors.sender_email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.sender_email)) {
      newErrors.sender_email = 'Please enter a valid email address.';
    }
    if (!form.subject.trim()) newErrors.subject = 'Subject is required.';
    if (!form.message.trim()) {
      newErrors.message = 'Message is required.';
    } else if (form.message.length > 5000) {
      newErrors.message = 'Message is too long (max 5000 characters).';
    }
    if (!form.consent) newErrors.consent = 'You must agree to proceed.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    try {
      await contactService.submitMessage({
        sender_name: form.sender_name.trim(),
        sender_email: form.sender_email.trim(),
        sender_phone: form.sender_phone?.trim() || '',
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        preferred_contact: form.preferred_contact,
        consent: form.consent,
      });
      setSubmitted(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        const fieldErrors: Partial<Record<keyof FormState, string>> = {};
        Object.entries(data.errors).forEach(([key, val]) => {
          fieldErrors[key as keyof FormState] = Array.isArray(val) ? (val as string[]).join(' ') : String(val);
        });
        setErrors(fieldErrors);
      } else {
        setServerError(
          data?.message || 'Something went wrong. Please try again or contact us directly.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setForm(
      isAuthenticated && user
        ? {
            ...INITIAL_FORM,
            sender_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            sender_email: user.email || '',
          }
        : INITIAL_FORM
    );
    setErrors({});
    setServerError('');
  };

  // ─── Success state ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <PublicLayout currentPage="contact">
        <div className="w-full px-4 md:px-12 py-10 md:py-24">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Icon name="check_circle" size={32} className="text-primary" />
            </div>
            <h1 className="text-text-main text-3xl md:text-4xl font-display font-medium mb-4">
              Message Received
            </h1>
            <p className="text-text-muted text-lg mb-8">
              Thank you for reaching out. A member of our team will review your message and
              respond to&nbsp;
              <span className="font-medium text-text-main">{form.sender_email}</span> soon.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-primary text-white rounded-btn font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Send another message
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────

  return (
    <PublicLayout currentPage="contact">
      <div className="w-full px-4 md:px-12 py-10 md:py-16">
        <div className="max-w-[760px] mx-auto flex flex-col gap-10">

          {/* Page header */}
          <div className="flex flex-col gap-4">
            <span className="text-text-muted text-xs font-bold tracking-widest uppercase">
              Get in Touch
            </span>
            <h1 className="text-text-main text-5xl md:text-6xl font-display font-medium leading-[1.1] tracking-tight">
              Contact Us
            </h1>
            <p className="text-text-muted text-lg md:text-xl font-display leading-relaxed max-w-2xl">
              Have a question, prayer request, or need support? Choose a category and send us a
              message — we&apos;ll respond to your email as soon as we can.
            </p>
          </div>

          {/* Auth notice */}
          {isAuthenticated && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl text-sm text-text-muted">
              <Icon name="person" size={18} className="text-primary shrink-0" />
              <span>
                You&apos;re signed in as{' '}
                <span className="font-medium text-text-main">{user?.email}</span>. Your details
                have been pre-filled but you can edit them below.
              </span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-surface border border-accent-sand/20 rounded-2xl p-6 md:p-10 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.08)] flex flex-col gap-6"
          >
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-main" htmlFor="category">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              >
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <FieldError error={errors.category} />
            </div>

            {/* Name + Email row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-main" htmlFor="sender_name">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="sender_name"
                  type="text"
                  name="sender_name"
                  value={form.sender_name}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Full name"
                  className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <FieldError error={errors.sender_name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-main" htmlFor="sender_email">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="sender_email"
                  type="email"
                  name="sender_email"
                  value={form.sender_email}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <FieldError error={errors.sender_email} />
              </div>
            </div>

            {/* Phone + Preferred contact row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-main" htmlFor="sender_phone">
                  Phone{' '}
                  <span className="text-text-muted font-normal text-xs">(optional)</span>
                </label>
                <input
                  id="sender_phone"
                  type="tel"
                  name="sender_phone"
                  value={form.sender_phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-main" htmlFor="preferred_contact">
                  Preferred Response Method
                </label>
                <select
                  id="preferred_contact"
                  name="preferred_contact"
                  value={form.preferred_contact}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  {PREFERRED_CONTACT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-main" htmlFor="subject">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                id="subject"
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Brief summary of your message"
                className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <FieldError error={errors.subject} />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-main" htmlFor="message">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={6}
                placeholder="Write your message here…"
                className="w-full px-4 py-3 rounded-xl border border-accent-sand/50 bg-background-light text-text-main text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
              />
              <div className="flex items-center justify-between">
                <FieldError error={errors.message} />
                <span className="text-xs text-text-muted ml-auto">{form.message.length}/5000</span>
              </div>
            </div>

            {/* Consent */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-accent-sand text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-text-muted leading-relaxed">
                  I agree to the{' '}
                  <a
                    href="/privacy-policy"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                  {' '}and consent to Serene Sanctuary storing and using my message to respond to my enquiry.
                </span>
              </label>
              <FieldError error={errors.consent} />
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <Icon name="error_outline" size={18} className="shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-text-muted">
                <span className="text-red-500">*</span> Required fields
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-btn font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
});

ContactPage.displayName = 'ContactPage';

export default ContactPage;
