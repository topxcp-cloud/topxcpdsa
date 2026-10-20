'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import {
  STUDENT_PROFILE_BRANCHES,
  STUDENT_PROFILE_SECTIONS,
  STUDENT_PROFILE_YEARS
} from '../../features/profile/studentProfileOptions.js';

export default function StudentProfileSetup({ user = {}, onSaved }) {
  const [name, setName] = useState(user?.name || '');
  const [academicYear, setAcademicYear] = useState(user?.academicYear || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [section, setSection] = useState(user?.section || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const trapDialogFocus = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll(
      'input:not(:disabled), select:not(:disabled), button:not(:disabled)'
    ));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const profile = {
      name: name.trim(),
      academicYear,
      branch: branch.trim(),
      section: section.trim()
    };
    if (!profile.name || !profile.academicYear || !profile.branch || !profile.section) {
      setError('Please complete all fields to continue.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { user: updatedUser } = await api(`/api/user/profile/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      onSaved(updatedUser);
    } catch (saveError) {
      setError(saveError.message || 'Profile setup could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="student-setup-backdrop">
      <section
        className="student-setup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-setup-title"
        aria-describedby="student-setup-copy"
        onKeyDown={trapDialogFocus}
      >
        <div className="student-setup-heading">
          <div className="student-setup-icon"><GraduationCap size={24} aria-hidden="true" /></div>
          <p className="student-setup-eyebrow">Welcome to TOP-X · Profile setup</p>
          <h2 id="student-setup-title">Let&apos;s complete your student profile</h2>
          <p className="student-setup-copy" id="student-setup-copy">
            Add your campus details to personalize your experience. You can update them any time from your profile.
          </p>
        </div>

        <form className="student-setup-form" onSubmit={handleSubmit}>
          <label className="student-setup-field">
            <span>Full name</span>
            <input
              autoFocus
              autoComplete="name"
              maxLength={80}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
            />
          </label>
          <div className="student-setup-fields">
            <label className="student-setup-field">
              <span>Year</span>
              <select required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
                <option value="">Choose your year</option>
                {STUDENT_PROFILE_YEARS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="student-setup-field">
              <span>Branch / degree</span>
              <select required value={branch} onChange={(event) => setBranch(event.target.value)}>
                <option value="">Choose your branch</option>
                {STUDENT_PROFILE_BRANCHES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="student-setup-field">
              <span>Section</span>
              <select required value={section} onChange={(event) => setSection(event.target.value)}>
                <option value="">Choose your section</option>
                {STUDENT_PROFILE_SECTIONS.map((value) => <option key={value} value={value}>Section {value}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="student-setup-error" role="alert">{error}</p>}
          <button className="btn-primary student-setup-submit" type="submit" disabled={saving}>
            <span>{saving ? 'Saving profile…' : 'Save and continue'}</span>
            {!saving && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
      </section>
    </div>
  );
}
