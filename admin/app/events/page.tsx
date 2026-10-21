'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '../../src/components/AdminLayout';
import { exportEventRegistrations, getEventRegistrations, getEvents, saveEvent, deleteEvent } from '../../src/services/api';
import { EventField, EventFieldType, EventRecord, EventRegistration } from '../../src/types';
import { CalendarDays, Check, CircleAlert, Download, Plus, Search, Trash2, X } from 'lucide-react';
import styles from './events.module.css';

const defaultFields: EventField[] = [
  { id: 'full-name', key: 'full_name', label: 'Full name', type: 'text', required: true, options: [] },
  { id: 'email-address', key: 'email', label: 'Email address', type: 'email', required: true, options: [] },
  { id: 'phone-number', key: 'phone', label: 'Phone number', type: 'phone', required: false, options: [] }
];

type EventForm = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  imageUrl: string;
  imageData: string;
  eventUrl: string;
  eventLinkType: 'linkedin' | 'custom';
  eventLinkLabel: string;
  status: 'open' | 'closed';
  showOnWebsite: boolean;
  fields: EventField[];
};

function blankEvent(): EventForm {
  return {
    title: '',
    description: '',
    location: '',
    startsAt: '',
    imageUrl: '',
    imageData: '',
    eventUrl: '',
    eventLinkType: 'custom',
    eventLinkLabel: 'Event details',
    status: 'open',
    showOnWebsite: true,
    fields: defaultFields.map(field => ({ ...field }))
  };
}

function eventToForm(event: EventRecord): EventForm {
  return {
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    startsAt: event.startsAt || '',
    imageUrl: event.imageUrl || '',
    imageData: event.imageData || '',
    eventUrl: event.eventUrl || '',
    eventLinkType: event.eventLinkType === 'linkedin' ? 'linkedin' : 'custom',
    eventLinkLabel: event.eventLinkLabel || 'Event details',
    status: event.status || 'open',
    showOnWebsite: event.showOnWebsite !== false,
    fields: event.fields.map(field => ({ ...field, options: [...(field.options || [])] }))
  };
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<EventForm>(blankEvent);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedEvent = events.find(event => event.id === selectedId) || null;

  useEffect(() => {
    let active = true;
    getEvents()
      .then(result => {
        if (!active) return;
        const items = result.events || [];
        setEvents(items);
        if (items.length) {
          setSelectedId(items[0].id);
          setForm(eventToForm(items[0]));
        }
      })
      .catch(err => { if (active) setError(err.message || 'Could not load events.'); })
      .finally(() => { if (active) setLoadingEvents(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRegistrations([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingRegistrations(true);
      getEventRegistrations(selectedId, search)
        .then(result => { if (active) setRegistrations(result.registrations || []); })
        .catch(err => { if (active) setError(err.message || 'Could not load registrations.'); })
        .finally(() => { if (active) setLoadingRegistrations(false); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selectedId, search]);

  const startNewEvent = () => {
    setSelectedId('');
    setForm(blankEvent());
    setSearch('');
    setError('');
    setNotice('');
  };

  const chooseEvent = (event: EventRecord) => {
    setSelectedId(event.id);
    setForm(eventToForm(event));
    setSearch('');
    setError('');
    setNotice('');
  };

  const updateField = (id: string, updates: Partial<EventField>) => {
    setForm(current => ({
      ...current,
      fields: current.fields.map(field => field.id === id ? { ...field, ...updates } : field)
    }));
  };

  const addField = () => {
    if (form.fields.length >= 30) {
      setError('An event can have at most 30 registration fields.');
      return;
    }
    const id = `field-${crypto.randomUUID()}`;
    setForm(current => ({
      ...current,
      fields: [...current.fields, { id, key: `field_${id.slice(6).replace(/-/g, '')}`, label: '', type: 'text', required: false, options: [] }]
    }));
    setError('');
  };

  const removeField = (field: EventField) => {
    if (field.type === 'email') return;
    setForm(current => ({ ...current, fields: current.fields.filter(item => item.id !== field.id) }));
  };

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Choose an image smaller than 12 MB.');
      return;
    }

    setError('');
    setCompressingImage(true);
    try {
      const bitmap = await createImageBitmap(file);
      let canvas: HTMLCanvasElement;
      try {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not prepare this image.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } finally {
        bitmap.close();
      }

      let quality = 0.82;
      let blob: Blob | null = null;
      for (let attempt = 0; attempt < 7; attempt++) {
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= 500 * 1024) break;
        quality = Math.max(0.45, quality - 0.08);
      }
      if (!blob || blob.size > 600 * 1024) {
        throw new Error('This image could not be compressed small enough. Choose a simpler or smaller image.');
      }
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the compressed image.'));
        reader.onerror = () => reject(new Error('Could not read the compressed image.'));
        reader.readAsDataURL(blob);
      });
      setForm(current => ({ ...current, imageData, imageUrl: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare the selected image.');
    } finally {
      setCompressingImage(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const fields = form.fields.map(field => ({
        ...field,
        key: field.type === 'email' ? 'email' : field.key,
        options: field.type === 'select' ? field.options : []
      }));
      const result = await saveEvent({ ...form, fields }, selectedId || undefined);
      const saved = { ...result.event, registrationCount: selectedEvent?.registrationCount || 0 };
      setEvents(current => selectedId
        ? current.map(item => item.id === selectedId ? saved : item)
        : [saved, ...current]);
      setSelectedId(saved.id);
      setForm(eventToForm(saved));
      setNotice('Event settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !selectedEvent) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedEvent.title}"?\n\nThis will permanently delete this event and its registrations.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await deleteEvent(selectedId);
      const remainingEvents = events.filter(item => item.id !== selectedId);
      setEvents(remainingEvents);
      if (remainingEvents.length) {
        setSelectedId(remainingEvents[0].id);
        setForm(eventToForm(remainingEvents[0]));
      } else {
        startNewEvent();
      }
      setNotice(`Event "${selectedEvent.title}" has been deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the event.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedId || !selectedEvent) return;
    setError('');
    setNotice('');
    setExporting(true);
    try {
      const response = await exportEventRegistrations(selectedId);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `CSV export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filename = selectedEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
      anchor.href = url;
      anchor.download = `${filename}-registrations.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice('Downloaded a CSV containing all registrations for this event.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed.');
    } finally {
      setExporting(false);
    }
  };

  const typeOptions: Array<{ value: EventFieldType; label: string }> = [
    { value: 'text', label: 'Short text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Long text' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  return (
    <AdminLayout title="Event Registration">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>COMMUNITY OPERATIONS</span>
            <h1><CalendarDays size={25} /> Event Registration</h1>
            <p>Create events, configure their registration forms, and review submissions.</p>
          </div>
          <button className={styles.primaryButton} type="button" onClick={startNewEvent}><Plus size={17} /> New event</button>
        </div>

        {error ? <div className={styles.errorBanner} role="alert"><CircleAlert size={17} />{error}</div> : null}
        {notice ? <div className={styles.successBanner} role="status"><Check size={17} />{notice}</div> : null}

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Event setup</h2><p>Configure what visitors see and what they must provide.</p></div>
              {events.length ? (
                <select className={styles.eventSelect} value={selectedId} onChange={event => {
                  const selected = events.find(item => item.id === event.target.value);
                  if (selected) chooseEvent(selected);
                }}>
                  {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              ) : null}
            </div>

            <form onSubmit={handleSave}>
              <div className={styles.formGrid}>
                <label className={styles.control}>
                  <span>Event name *</span>
                  <input required maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
                </label>
                <label className={styles.control}>
                  <span>Date and time</span>
                  <input type="datetime-local" value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} />
                </label>
                <label className={styles.control}>
                  <span>Location</span>
                  <input maxLength={200} value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} placeholder="Venue or online" />
                </label>
                <label className={styles.control}>
                  <span>Registration</span>
                  <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as 'open' | 'closed' })}>
                    <option value="open">Open (accepting entries)</option>
                    <option value="closed">Closed (no new entries)</option>
                  </select>
                </label>
                <label className={styles.control}>
                  <span>Website visibility</span>
                  <select
                    value={form.showOnWebsite ? 'visible' : 'hidden'}
                    onChange={event => setForm({ ...form, showOnWebsite: event.target.value === 'visible' })}
                  >
                    <option value="visible">Show on website</option>
                    <option value="hidden">Hide from website (admin panel only)</option>
                  </select>
                </label>
                <label className={`${styles.control} ${styles.fullWidth}`}>
                  <span>Description</span>
                  <textarea maxLength={3000} rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
                </label>
              </div>

              <div className={styles.fieldsHeading}>
                <div><h3>Event image &amp; link</h3><p>Upload an image directly or paste an image URL. Add an optional destination such as your LinkedIn event page.</p></div>
              </div>
              <div className={styles.formGrid}>
                <label className={`${styles.control} ${styles.fullWidth}`}>
                  <span>Upload event image (JPG, PNG, or WebP)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFile} disabled={compressingImage} />
                </label>
                {compressingImage ? <p className={`${styles.helpText} ${styles.fullWidth}`}>Preparing image…</p> : null}
                {form.imageData ? (
                  <button className={`${styles.secondaryButton} ${styles.fullWidth}`} type="button" onClick={() => setForm(current => ({ ...current, imageData: '' }))}>Remove uploaded image</button>
                ) : null}
                <label className={`${styles.control} ${styles.fullWidth}`}>
                  <span>Or use an event image URL</span>
                  <input type="url" maxLength={2048} value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value, imageData: '' })} placeholder="https://example.com/event-image.jpg" />
                </label>
                {form.imageData || form.imageUrl ? (
                  <div className={`${styles.imagePreview} ${styles.fullWidth}`}>
                    <img src={form.imageData || form.imageUrl} alt="Preview of the event image" onError={event => { event.currentTarget.hidden = true; }} onLoad={event => { event.currentTarget.hidden = false; }} />
                    <span>Image preview</span>
                  </div>
                ) : null}
                <label className={`${styles.control} ${styles.fullWidth}`}>
                  <span>Event information URL</span>
                  <input type="url" maxLength={2048} value={form.eventUrl} onChange={event => setForm({ ...form, eventUrl: event.target.value })} placeholder="https://www.linkedin.com/events/…" />
                </label>
                <label className={`${styles.control} ${styles.fullWidth}`}>
                  <span>Public link name</span>
                  <select value={form.eventLinkType} onChange={event => setForm({ ...form, eventLinkType: event.target.value as 'linkedin' | 'custom' })}>
                    <option value="linkedin">LinkedIn profile</option>
                    <option value="custom">Custom name</option>
                  </select>
                </label>
                {form.eventLinkType === 'custom' ? (
                  <label className={`${styles.control} ${styles.fullWidth}`}>
                    <span>Custom link name</span>
                    <input maxLength={40} value={form.eventLinkLabel} onChange={event => setForm({ ...form, eventLinkLabel: event.target.value })} placeholder="e.g. View event details" />
                  </label>
                ) : null}
              </div>

              <div className={styles.fieldsHeading}>
                <div><h3>Registration fields</h3><p>Add or remove fields and choose which are required.</p></div>
                <button className={styles.secondaryButton} type="button" onClick={addField}><Plus size={15} /> Add field</button>
              </div>
              <div className={styles.fieldList}>
                {form.fields.map(field => (
                  <div className={styles.fieldRow} key={field.id}>
                    <label className={styles.control}>
                      <span>Field label</span>
                      <input
                        required
                        maxLength={80}
                        value={field.label}
                        onChange={event => updateField(field.id, { label: event.target.value })}
                        placeholder="e.g. College"
                      />
                    </label>
                    <label className={styles.control}>
                      <span>Type</span>
                      <select
                        value={field.type}
                        disabled={field.type === 'email'}
                        onChange={event => {
                          const type = event.target.value as EventFieldType;
                          updateField(field.id, { type, options: [], required: type === 'email' || field.required });
                        }}
                      >
                        {typeOptions.filter(option => option.value !== 'email' || field.type === 'email').map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {field.type === 'select' ? (
                      <label className={styles.control}>
                        <span>Options (comma-separated)</span>
                        <input
                          required
                          value={field.options.join(', ')}
                          onChange={event => updateField(field.id, { options: event.target.value.split(',').map(option => option.trim()).filter(Boolean) })}
                          placeholder="Student, Professional"
                        />
                      </label>
                    ) : <div className={styles.controlSpacer} />}
                    <label className={styles.requiredToggle}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={field.type === 'email'}
                        onChange={event => updateField(field.id, { required: event.target.checked })}
                      />
                      Required
                    </label>
                    <button className={styles.iconButton} type="button" onClick={() => removeField(field)} disabled={field.type === 'email'} aria-label={`Remove ${field.label || 'field'}`} title={field.type === 'email' ? 'Email is required for duplicate checking' : 'Remove field'}>
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <p className={styles.helpText}>Email is required to identify each registration.</p>
              <div className={styles.formActions}>
                {selectedId ? (
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || saving || loadingEvents}
                    title="Permanently delete this event and all its registrations"
                  >
                    <Trash2 size={15} />
                    {deleting ? 'Deleting…' : 'Delete event'}
                  </button>
                ) : <div />}
                <button className={styles.primaryButton} type="submit" disabled={saving || deleting || loadingEvents || compressingImage}>
                  {compressingImage ? 'Preparing image…' : saving ? 'Saving…' : selectedId ? 'Save event' : 'Create event'}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Registrations</h2><p>{selectedEvent ? `${selectedEvent.registrationCount || 0} total for ${selectedEvent.title}` : 'Create an event to start collecting registrations.'}</p></div>
            </div>
            {selectedEvent ? (
              <>
                <div className={styles.registrationTools}>
                  <label className={styles.searchBox}>
                    <Search size={16} />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search registration details" />
                  </label>
                  <button className={styles.exportButton} type="button" onClick={handleExport} disabled={exporting}>
                    <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
                  </button>
                </div>
                <p className={styles.csvHelp}>Downloads all registrations for this event with every form field and registration time.</p>
                {loadingRegistrations ? <p className={styles.emptyState}>Loading registrations…</p> : registrations.length ? (
                  <div className={styles.registrationList}>
                    {registrations.map(registration => (
                      <article className={styles.registrationCard} key={registration.id}>
                        <div className={styles.registrationTop}>
                          <strong>{String(registration.values.full_name || registration.values.name || registration.email)}</strong>
                          <time>{new Date(registration.createdAt).toLocaleString()}</time>
                        </div>
                        <dl>
                          {Object.entries(registration.values || {}).map(([key, value]) => {
                            const field = selectedEvent.fields.find(item => item.key === key);
                            const label = field?.label || key.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
                            const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || '—');
                            return (
                              <div key={key}>
                                <dt>{label}</dt>
                                <dd>{displayValue}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>{search ? 'No registrations match your search.' : 'No registrations yet. Share the public events page to get started.'}</p>
                )}
              </>
            ) : (
              <p className={styles.emptyState}>{loadingEvents ? 'Loading events…' : 'Create an event to view its registrations.'}</p>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
