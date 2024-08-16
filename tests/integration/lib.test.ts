import { beforeEach, describe, expect, test } from "vitest";
import { ScrapingBrowser } from "../../src/index.js";

describe("ScrapingBrowser", () => {
  let browser: ScrapingBrowser;

  beforeEach(() => {
    browser = new ScrapingBrowser({
      apiKey: process.env.CI_ZENROWS_API_KEY,
      apiURL: process.env.CI_ZENROWS_API_URL,
    });
  });

  test("should take a screenshot", { timeout: 10000 }, async () => {
    const result = await browser.screenshot("https://httpbin.io/html");
    expect(result?.length).to.toBeDefined();
  });
});
