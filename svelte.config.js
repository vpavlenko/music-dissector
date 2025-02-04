import adapter from "@sveltejs/adapter-static";
import vercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/kit/vite";

const dev = process.argv.includes("dev");

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  vitePlugin: {
    inspector: true,
  },
  kit: {
    adapter: vercel(),
    paths: {
      base: dev ? "" : process.env.BASE_PATH,
    },
  },
};
export default config;
