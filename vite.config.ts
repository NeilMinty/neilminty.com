import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react-swc';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import path from 'path';

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }) },
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
