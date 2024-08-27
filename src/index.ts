import puppeteer from "puppeteer-core";
import { MissingAPIKeyError, ParameterValidationError } from "./errors.js";
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
   * @throws {ParameterValidationError} If an invalid option is provided
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

    if (opts.sessionTTL) {
      if (
        !Number.isInteger(opts.sessionTTL) ||
        opts.sessionTTL < 60 ||
        opts.sessionTTL > 900
      ) {
        throw new ParameterValidationError(
          "SessionTTL must be a number between 60 and 900 seconds",
        );
      }

      url += `&session_ttl=${convertSecondsToDuration(opts.sessionTTL)}`;
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

/**
 * Convert seconds to a duration string.
 * @param seconds - The number of seconds to convert
 * @returns The duration string (e.g. 60s, 900s, 5m, 10m, 1m30s)
 * @private
 */
function convertSecondsToDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  let duration = "";

  if (minutes > 0) {
    duration += `${minutes}m`;
  }

  if (remainingSeconds > 0 || minutes === 0) {
    duration += `${remainingSeconds}s`;
  }

  return duration;
}

export { ScrapingBrowser, ProxyRegion, ProxyCountry };
