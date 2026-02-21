import { expect, test } from '@playwright/test';
import decodeQR from '@paulmillr/qr/decode.js';

const TEST_CASES = [
  'https://magic-weblab.com.ua/en',
  'HELLO WORLD',
  'https://example.com',
  '1234567890',
];

for (const input of TEST_CASES) {
  test(`QR encodes and decodes: "${input}"`, async ({ page }) => {
    await page.goto('/');

    // Wait for React hydration — textarea becomes interactive
    const textarea = page.locator('#qr-data');
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    // Use click + type to ensure React onChange fires
    await textarea.click();
    await textarea.pressSequentially(input, { delay: 10 });

    // Wait for canvas to appear (debounce 150ms + render)
    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 10000 });

    // Small extra wait for canvas paint
    await page.waitForTimeout(200);

    // Extract RGBA pixels directly from canvas
    const pixelData = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d')!;
      const img = ctx.getImageData(0, 0, c.width, c.height);
      return {
        data: Array.from(img.data),
        width: c.width,
        height: c.height,
      };
    });

    const decoded = decodeQR({
      data: new Uint8Array(pixelData.data),
      width: pixelData.width,
      height: pixelData.height,
    });

    expect(decoded).toBe(input);
  });
}
