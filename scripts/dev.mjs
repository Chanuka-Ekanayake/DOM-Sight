// Runs both Vite builds in watch mode so `dist/` stays current while developing.
import { build } from 'vite';
await build({ configFile: 'vite.config.ts', build: { watch: {} } });
await build({ configFile: 'vite.content.config.ts', build: { watch: {} } });
