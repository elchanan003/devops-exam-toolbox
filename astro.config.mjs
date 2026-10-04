// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sidebar from './src/sidebar.mjs';
import { remarkPlaceholderMarkers, rehypeInlinePlaceholders } from './src/plugins/placeholders.mjs';

export default defineConfig({
  site: 'https://elchanan003.github.io',
  base: '/devops-exam-toolbox',
  markdown: {
    smartypants: false, // never turn -- into an em-dash: commands must stay copyable
    remarkPlugins: [remarkPlaceholderMarkers],
    rehypePlugins: [rehypeInlinePlaceholders],
  },
  integrations: [
    starlight({
      title: 'ארגז כלים · DevOps Final',
      defaultLocale: 'root',
      locales: { root: { label: 'עברית', lang: 'he', dir: 'rtl' } },
      customCss: ['./src/styles/fonts.css', './src/styles/custom.css'],
      sidebar,
      lastUpdated: false,
      pagination: true,
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/elchanan003/devops-exam-toolbox' }],
    }),
  ],
});
