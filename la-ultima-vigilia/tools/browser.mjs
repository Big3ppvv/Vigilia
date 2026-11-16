/* Usa el navegador de Playwright en CI; permite Chromium del sistema en local. */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const launchBrowser = (options = {}) => chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}
    : {}),
  ...options
});
