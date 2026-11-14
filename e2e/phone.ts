// The phone and browser the app is tested and played on.
// Shared by the end-to-end tests and `npm run play`.

export const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}

export const browser = {
  // The system Chrome, so no browser download is needed (also preinstalled on GitHub's runners).
  channel: 'chrome',
  // Without this, headless Chrome can hang for 20 s or more when opening its first page on a
  // machine where DISPLAY is set but the GPU process cannot start (seen on a cold start here).
  args: ['--disable-gpu'],
}
