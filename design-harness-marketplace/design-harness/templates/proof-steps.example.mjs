// Example proof steps module for an interactive design-check.
// Pass it with: node proof.mjs --steps ./proof-steps.example.mjs --mode interactive ...
//
// Drive the EXACT interaction you want captured. Call capture('name') at each
// frame you want in the GIF. Keep it to ~4-8 frames for a legible GIF.
//
// `page` is a Playwright Page already navigated to your --url.

export default async function steps(page, capture) {
  await capture("initial");

  // Example: open an "Add to ..." popover and show it mirrors the canonical pattern.
  const trigger = page.locator('[data-add-action]').first();
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(200);
    await capture("popover-open");

    // type into the search/name input at the bottom of the popover
    const input = page.locator('[role="dialog"] input').first();
    if (await input.count()) {
      await input.fill("Q3 launch");
      await page.waitForTimeout(150);
      await capture("popover-typed");
    }

    // close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    await capture("popover-closed");
  }
}
