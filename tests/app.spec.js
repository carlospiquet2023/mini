import { expect, test } from '@playwright/test';

function watchRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('inicia sem erros e troca todos os jogos', async ({ page }) => {
  const errors = watchRuntimeErrors(page);
  await page.goto('/');
  await expect(page.locator('.console-wrapper')).toBeVisible();
  await expect(page.locator('.app-error')).toHaveCount(0);

  const gameIds = ['worm', 'space', 'pacman', 'tetris', 'runner', 'mermaid'];
  for (const gameId of gameIds) {
    await page.locator('#open-games-menu').click();
    await page.locator(`[data-game="${gameId}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-game', gameId);
    await expect(page.locator('#mini-layer')).toHaveClass(/visible/);
  }

  await page.locator('#back-btn').click();
  await expect(page.locator('body')).toHaveAttribute('data-game', 'balls');
  expect(errors).toEqual([]);
});

test('mantém canvas e jogo ativos ao girar a tela', async ({ page }) => {
  const errors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('html')).toHaveAttribute('data-orientation', 'landscape');
  await expect(page.locator('body')).toHaveAttribute('data-game', 'balls');
  await expect.poll(() => page.evaluate(() => {
    const bezel = document.querySelector('.screen-bezel');
    const canvas = document.querySelector('#game-canvas');
    return Math.round(parseFloat(canvas.style.width)) === bezel.clientWidth
      && Math.round(parseFloat(canvas.style.height)) === bezel.clientHeight;
  })).toBe(true);

  await page.locator('#open-games-menu').click();
  await page.locator('[data-game="space"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('html')).toHaveAttribute('data-orientation', 'portrait');
  await expect(page.locator('body')).toHaveAttribute('data-game', 'space');

  await expect.poll(() => page.evaluate(() => {
    const bezel = document.querySelector('.screen-bezel');
    const canvas = document.querySelector('#mini-canvas');
    return Math.round(parseFloat(canvas.style.width)) === bezel.clientWidth
      && Math.round(parseFloat(canvas.style.height)) === bezel.clientHeight;
  })).toBe(true);
  expect(errors).toEqual([]);
});

test('unifica ponteiro e limpa estado pressionado', async ({ page }) => {
  await page.goto('/');
  const action = page.locator('#button-a');
  await action.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  await action.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' });
  await expect(action).toHaveAttribute('aria-pressed', 'false');
});

test('não cria overflow nem corta controles em telas compactas', async ({ page }) => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 568, height: 320 },
    { width: 360, height: 640 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth <= window.innerWidth,
      vertical: document.documentElement.scrollHeight <= window.innerHeight,
      controlsVisible: [...document.querySelectorAll('#button-a, #button-b, #open-games-menu')]
        .every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left >= 0 && rect.top >= 0
            && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
        })
    }))).toEqual({ horizontal: true, vertical: true, controlsVisible: true });
  }
});

test('carrega o app instalado sem rede', async ({ page, context }) => {
  const errors = watchRuntimeErrors(page);
  await page.goto('/');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle('Carlos Piquet Games');
  await expect(page.locator('.console-wrapper')).toBeVisible();
  await expect(page.locator('.app-error')).toHaveCount(0);
  expect(errors).toEqual([]);
});
