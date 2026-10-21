'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ExternalLink, Linkedin, MapPin, UsersRound } from 'lucide-react';
import AppHeader from '../legacy-src/components/shell/AppHeader.jsx';
import AppFooter from '../legacy-src/components/shell/AppFooter.jsx';
import styles from './EventRegistration.module.css';

type EventField = {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options: string[];
};

type PublicEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  imageUrl?: string;
  imageData?: string;
  eventUrl?: string;
  eventLinkType?: 'linkedin' | 'custom';
  eventLinkLabel?: string;
  status?: 'open' | 'closed';
  showOnWebsite?: boolean;
  fields: EventField[];
};

export default function EventRegistration() {
  const router = useRouter();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/events')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load events.');
        if (active) setEvents(Array.isArray(data.events) ? data.events : []);
      })
      .catch(err => { if (active) setError(err.message || 'Could not load events.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const startRegistration = (event: PublicEvent) => {
    setSelectedEvent(event);
    setValues({});
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    if (selectedEvent) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedEvent]);

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEvent) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(selectedEvent.id)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit your registration.');
      setSuccess(`You are registered for ${selectedEvent.title}.`);
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateValue = (field: EventField, value: string | boolean) => {
    setValues(current => ({ ...current, [field.key]: value }));
  };

  return (
    <div className="topx-react-app events-app">
      <AppHeader onOpenAuth={() => router.push('/login')} />
      <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}><CalendarDays size={15} /> TOP-X COMMUNITY</span>
        <h1>Event Registration</h1>
        <p>Find your next opportunity to learn, build, and compete with the TOP-X community.</p>
      </section>

      <section className={styles.content} aria-label="Open events">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>UPCOMING</span>
            <h2>Open registrations</h2>
          </div>
          <span className={styles.eventCount}>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
        </div>

        {loading ? <p className={styles.notice}>Loading events…</p> : null}
        {error && !selectedEvent ? <p className={styles.error} role="alert">{error}</p> : null}
        {!loading && !error && events.length === 0 ? (
          <div className={styles.empty}>
            <UsersRound size={26} />
            <h3>No open events right now</h3>
            <p>Check back soon for the next TOP-X event.</p>
          </div>
        ) : null}

        <div className={styles.eventGrid}>
          {events.map(event => (
            <article className={styles.eventCard} key={event.id}>
              <div className={styles.eventImage}>
                {event.imageData || event.imageUrl ? (
                  <img
                    className={styles.eventImg}
                    src={event.imageData || event.imageUrl}
                    alt={`${event.title} event`}
                    loading="lazy"
                    onError={imageError => {
                      imageError.currentTarget.style.display = 'none';
                      const placeholder = imageError.currentTarget.parentElement?.querySelector(`.${styles.imagePlaceholder}`);
                      if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className={styles.imagePlaceholder}
                  style={{ display: (event.imageData || event.imageUrl) ? 'none' : 'flex' }}
                >
                  <CalendarDays size={36} />
                  <span>TOP-X COMMUNITY EVENT</span>
                </span>
                <div className={styles.eventBadgeOverlay}>
                  {event.status === 'closed' ? (
                    <span className={styles.badgeClosed}>Closed</span>
                  ) : (
                    <span className={styles.badgeOpen}>
                      <span className={styles.dotPulse} /> Open
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.eventCardBody}>
                <div>
                  <div className={styles.eventMetaChips}>
                    {event.startsAt ? (
                      <span className={styles.metaChip}>
                        <CalendarDays size={14} /> {new Date(event.startsAt).toLocaleString()}
                      </span>
                    ) : null}
                    {event.location ? (
                      <span className={styles.metaChip}>
                        <MapPin size={14} /> {event.location}
                      </span>
                    ) : null}
                  </div>
                  <h3>{event.title}</h3>
                  {event.description ? <p className={styles.description}>{event.description}</p> : null}
                </div>
                <div className={styles.cardActions}>
                  {event.status === 'closed' ? (
                    <button type="button" className={`${styles.registerButton} ${styles.disabledButton}`} disabled>
                      Registration closed
                    </button>
                  ) : (
                    <button type="button" className={styles.registerButton} onClick={() => startRegistration(event)}>
                      Register for event <span aria-hidden="true">→</span>
                    </button>
                  )}
                  {event.eventUrl ? (
                    event.eventLinkType === 'linkedin' || event.eventUrl.toLowerCase().includes('linkedin') ? (
                      <a
                        className={styles.linkedinLink}
                        href={event.eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn profile"
                      >
                        <Linkedin size={16} className={styles.linkedinIcon} />
                        <span>{event.eventLinkType === 'linkedin' ? 'LinkedIn profile' : (event.eventLinkLabel || 'LinkedIn profile')}</span>
                        <ExternalLink size={12} style={{ opacity: 0.65 }} />
                      </a>
                    ) : (
                      <a
                        className={styles.eventLink}
                        href={event.eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{event.eventLinkLabel || 'Event details'}</span>
                        <ExternalLink size={14} />
                      </a>
                    )
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        {selectedEvent ? (
          <section className={styles.formCard} aria-labelledby="registration-title" ref={formRef}>
            <div className={styles.formHeading}>
              <div>
                <span className={styles.kicker}>YOUR DETAILS</span>
                <h2 id="registration-title">Register for {selectedEvent.title}</h2>
              </div>
              <button className={styles.cancelButton} type="button" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
            <form className={styles.form} onSubmit={submitRegistration}>
              {selectedEvent.fields.map(field => (
                <label className={`${styles.field} ${field.type === 'checkbox' ? styles.checkboxField : ''}`} key={field.id}>
                  {field.type === 'checkbox' ? (
                    <>
                      <input
                        type="checkbox"
                        required={field.required}
                        checked={values[field.key] === true}
                        onChange={event => updateValue(field, event.target.checked)}
                      />
                      <span>{field.label}{field.required ? ' *' : ''}</span>
                    </>
                  ) : (
                    <>
                      <span>{field.label}{field.required ? ' *' : ''}</span>
                      {field.type === 'textarea' ? (
                        <textarea required={field.required} value={String(values[field.key] || '')} onChange={event => updateValue(field, event.target.value)} />
                      ) : field.type === 'select' ? (
                        <select required={field.required} value={String(values[field.key] || '')} onChange={event => updateValue(field, event.target.value)}>
                          <option value="">Select an option</option>
                          {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'phone' ? 'tel' : field.type}
                          required={field.required}
                          value={String(values[field.key] || '')}
                          onChange={event => updateValue(field, event.target.value)}
                        />
                      )}
                    </>
                  )}
                </label>
              ))}
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              {success ? <p className={styles.success} role="status">{success}</p> : null}
              <button className={styles.submitButton} type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit registration'}
              </button>
              <p className={styles.requiredNote}>Fields marked * are required.</p>
            </form>
          </section>
        ) : null}
      </section>
      </main>
      <AppFooter />
    </div>
  );
}
