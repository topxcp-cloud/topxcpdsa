import type { Metadata } from 'next';
import EventRegistration from '@/components/events/EventRegistration';

export const metadata: Metadata = {
  title: 'Event Registration | TOP-X',
  description: 'Explore upcoming TOP-X events and register.'
};

export default function EventsPage() {
  return <EventRegistration />;
}
