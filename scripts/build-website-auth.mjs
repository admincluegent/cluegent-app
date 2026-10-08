import { build } from 'esbuild';
import { config } from 'dotenv';
config({ quiet: true });
const keys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'];
const publicEnv = {};
for (const key of keys) {
  const name = `VITE_FIREBASE_${key}`;
  if (!process.env[name]) throw new Error(`Missing ${name}`);
  publicEnv[name] = process.env[name];
}
publicEnv.VITE_FIREBASE_DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'cluegent';
// Same-origin Firebase Hosting auth helper avoids blocked third-party redirect storage.
publicEnv.VITE_FIREBASE_AUTH_DOMAIN = process.env.WEBSITE_AUTH_DOMAIN || 'www.cluegent.com';
await build({ entryPoints: ['website-src/signup-auth.ts'], outfile: 'website/signup-auth.js', bundle: true,
  format: 'esm', minify: true, target: 'es2022', alias: { '@/firebase': './src/firebase.ts' },
  define: { 'import.meta.env': JSON.stringify(publicEnv) } });
