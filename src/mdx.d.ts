declare module '*.mdx' {
  import type { ComponentType } from 'react';
  export const title: string;
  export const date: string;
  export const slug: string;
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
