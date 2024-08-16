import puppeteer from "puppeteer-core";
import { MissingAPIKeyError } from "./errors.js";
import type {
  ClientOptions,
  ConnectOptions,
  ScreenshotOptions,
} from "./types.js";
import { ProxyCountry, ProxyRegion } from "./types.js";

/**
 * A class to interact with the ZenRows' Scraping Browser API
 * @throws {MissingAPIKeyError} If no API key is provided
 */
export default class ScrapingBrowser {
  /* The ZenRows API key to use. Can be obtained from the ZenRows dashboard */
  private readonly apiKey: string;
  /* The URL of the ZenRows' Scraping Browser API */
  private readonly apiURL: string;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.ZENROWS_API_KEY || "";
    this.apiURL =
      (options.insecure ? "ws://" : "wss://") +
      (options.apiURL || "browser.zenrows.com");

    if (!this.apiKey) {
      throw MissingAPIKeyError;
    }
  }

  /**
   * Get the WebSocket URL to connect to the ZenRows' Scraping Browser API
   * @param opts - Options to configure the connection
   * @returns The WebSocket URL
   */
  getConnectURL(opts: ConnectOptions = {}): string {
    let url = `${this.apiURL}?apikey=${this.apiKey}`;

    if (opts.proxy?.location) {
      url += ProxyCountry.isValid(opts.proxy.location)
        ? `&proxy_country=${opts.proxy.location}`
        : ProxyRegion.isValid(opts.proxy.location)
          ? `&proxy_region=${opts.proxy.location}`
          : "";
    }

    return url;
  }

  /**
   * Take a screenshot of a page using the ZenRows' Scraping Browser API.
   * @param url - The URL of the page to take a screenshot of
   * @param options - Options to configure the screenshot
   */
  async screenshot(
    url: string,
    options: ScreenshotOptions = { fullPage: false },
  ): Promise<Buffer | undefined> {
    if (!url) {
      throw new Error("A URL is required to take a screenshot");
    }

    const browser = await puppeteer.connect({
      browserWSEndpoint: this.getConnectURL({ proxy: options.proxy }),
    });

    const pages = await browser.pages();
    const page = pages[0];
    await page?.goto(url);
    const screenshot = await page?.screenshot({ fullPage: options.fullPage });
    await browser.close();
    return screenshot;
  }
}

export { ScrapingBrowser, ProxyRegion, ProxyCountry };
