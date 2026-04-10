import type { ComponentType } from 'react';

interface NoteModule {
  default: ComponentType;
  title: string;
  date: string | Date;
  slug: string;
}

function normaliseDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export interface NoteMeta {
  title: string;
  date: string;
  slug: string;
}

export interface NoteWithComponent extends NoteMeta {
  Component: ComponentType;
}

const modules = import.meta.glob<NoteModule>('/content/notes/*.mdx', { eager: true });

export function getAllNotes(): NoteMeta[] {
  return Object.values(modules)
    .map((mod) => ({ title: mod.title, date: normaliseDate(mod.date), slug: mod.slug }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getNoteBySlug(slug: string): NoteWithComponent | null {
  const entry = Object.values(modules).find((mod) => mod.slug === slug);
  if (!entry) return null;
  return { title: entry.title, date: normaliseDate(entry.date), slug: entry.slug, Component: entry.default };
}
