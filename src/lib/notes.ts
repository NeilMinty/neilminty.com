import type { ComponentType } from 'react';

interface NoteFrontmatter {
  title: string;
  date: string | Date;
  slug: string;
}

interface NoteModule {
  default: ComponentType;
  frontmatter: NoteFrontmatter;
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
    .map((mod) => ({
      title: mod.frontmatter.title,
      date: normaliseDate(mod.frontmatter.date),
      slug: mod.frontmatter.slug,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getNoteBySlug(slug: string): NoteWithComponent | null {
  const entry = Object.values(modules).find((mod) => mod.frontmatter.slug === slug);
  if (!entry) return null;
  return {
    title: entry.frontmatter.title,
    date: normaliseDate(entry.frontmatter.date),
    slug: entry.frontmatter.slug,
    Component: entry.default,
  };
}
