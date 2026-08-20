import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  MissingAPIKeyError,
  ParameterValidationError,
} from "../../src/errors.js";
import { ScrapingBrowser } from "../../src/index.js";
import { ProxyCountry, ProxyRegion } from "../../src/types.js";

describe("ScrapingBrowser", () => {
  let browser: ScrapingBrowser;

  beforeEach(() => {
    browser = new ScrapingBrowser({ apiKey: "test" });
  });

  afterEach(() => {
    // Not `delete process.env.X` (flagged by biome's noDelete) and not
    // `= undefined` either — Node coerces that to the string "undefined",
    // which would make later tests' `|| process.env.ZENROWS_API_KEY` checks
    // see a truthy value instead of an actually-unset var.
    Reflect.deleteProperty(process.env, "ZENROWS_API_KEY");
  });

  test("should throw if no apikey is configured", () => {
    expect(() => {
      new ScrapingBrowser();
    }).to.throw(MissingAPIKeyError);
  });

  test("should fall back to the ZENROWS_API_KEY env var when no apiKey option is given", () => {
    process.env.ZENROWS_API_KEY = "from-env";

    expect(new ScrapingBrowser().getConnectURL()).to.equal(
      "wss://browser.zenrows.com?apikey=from-env",
    );
  });

  test("an explicit apiKey option takes precedence over the env var", () => {
    process.env.ZENROWS_API_KEY = "from-env";

    expect(
      new ScrapingBrowser({ apiKey: "explicit" }).getConnectURL(),
    ).to.equal("wss://browser.zenrows.com?apikey=explicit");
  });

  test("should return the api url", () => {
    expect(browser.getConnectURL()).to.equal(
      "wss://browser.zenrows.com?apikey=test",
    );
  });

  test("should return the api url with insecure schema", () => {
    expect(
      new ScrapingBrowser({
        apiKey: "test",
        insecure: true,
      }).getConnectURL(),
    ).to.equal("ws://browser.zenrows.com?apikey=test");
  });

  test("should respect a custom apiURL option", () => {
    expect(
      new ScrapingBrowser({
        apiKey: "test",
        apiURL: "custom.example.com",
      }).getConnectURL(),
    ).to.equal("wss://custom.example.com?apikey=test");
  });

  test("should return the api url with proxy country", () => {
    expect(
      browser.getConnectURL({
        proxy: { location: ProxyCountry.US },
      }),
    ).to.equal("wss://browser.zenrows.com?apikey=test&proxy_country=us");
  });

  test("should return the api url with proxy region", () => {
    // ProxyRegion.Europe === "eu" — the wire format is the short code, same as
    // every other region (ap/na/me/sa/af) and the analogous proxy_country
    // branch above. A prior version of this test asserted "europe" here,
    // which never matched and had silently never run (deps weren't installed).
    expect(
      browser.getConnectURL({
        proxy: { location: ProxyRegion.Europe },
      }),
    ).to.equal("wss://browser.zenrows.com?apikey=test&proxy_region=eu");
  });

  test("an unrecognized proxy location is silently dropped, not rejected", () => {
    // Documents current behavior: getConnectURL has no else-throw branch for
    // an invalid location, so a typo'd country/region code produces a URL
    // with no proxy param at all rather than an error. Worth knowing if this
    // ever needs to change to fail loudly instead.
    expect(
      browser.getConnectURL({
        // @ts-expect-error — deliberately invalid to exercise the fallback branch
        proxy: { location: "not-a-real-location" },
      }),
    ).to.equal("wss://browser.zenrows.com?apikey=test");
  });

  describe("sessionTTL", () => {
    test("accepts the minimum boundary (60s) and renders as seconds", () => {
      expect(browser.getConnectURL({ sessionTTL: 60 })).to.equal(
        "wss://browser.zenrows.com?apikey=test&session_ttl=1m",
      );
    });

    test("accepts the maximum boundary (900s) and renders as minutes", () => {
      expect(browser.getConnectURL({ sessionTTL: 900 })).to.equal(
        "wss://browser.zenrows.com?apikey=test&session_ttl=15m",
      );
    });

    test("renders a mixed minutes+seconds duration", () => {
      expect(browser.getConnectURL({ sessionTTL: 90 })).to.equal(
        "wss://browser.zenrows.com?apikey=test&session_ttl=1m30s",
      );
    });

    test("renders a pure-seconds duration under a minute boundary", () => {
      expect(browser.getConnectURL({ sessionTTL: 61 })).to.equal(
        "wss://browser.zenrows.com?apikey=test&session_ttl=1m1s",
      );
    });

    test("rejects a value below the 60s minimum", () => {
      expect(() => browser.getConnectURL({ sessionTTL: 59 })).to.throw(
        ParameterValidationError,
      );
    });

    test("rejects a value above the 900s maximum", () => {
      expect(() => browser.getConnectURL({ sessionTTL: 901 })).to.throw(
        ParameterValidationError,
      );
    });

    test("rejects a non-integer value", () => {
      expect(() => browser.getConnectURL({ sessionTTL: 60.5 })).to.throw(
        ParameterValidationError,
      );
    });

    test("combines with a proxy option in the same call", () => {
      expect(
        browser.getConnectURL({
          proxy: { location: ProxyCountry.US },
          sessionTTL: 120,
        }),
      ).to.equal(
        "wss://browser.zenrows.com?apikey=test&proxy_country=us&session_ttl=2m",
      );
    });
  });

  describe("screenshot", () => {
    test("rejects with no url provided", async () => {
      // @ts-expect-error — deliberately omitting the required argument
      await expect(browser.screenshot()).rejects.toThrow(
        "A URL is required to take a screenshot",
      );
    });

    test("connects via the computed connect URL, navigates, and returns the screenshot buffer", async () => {
      const expectedBuffer = Buffer.from("fake-png-bytes");
      const goto = vi.fn().mockResolvedValue(undefined);
      const screenshotFn = vi.fn().mockResolvedValue(expectedBuffer);
      const page = { goto, screenshot: screenshotFn };
      const close = vi.fn().mockResolvedValue(undefined);
      const pages = vi.fn().mockResolvedValue([page]);
      const connect = vi.fn().mockResolvedValue({ pages, close });

      const puppeteer = await import("puppeteer-core");
      const connectSpy = vi
        .spyOn(puppeteer.default, "connect")
        .mockImplementation(connect);

      const result = await browser.screenshot("https://example.com", {
        fullPage: true,
      });

      expect(connectSpy).toHaveBeenCalledWith({
        browserWSEndpoint: "wss://browser.zenrows.com?apikey=test",
      });
      expect(goto).toHaveBeenCalledWith("https://example.com");
      expect(screenshotFn).toHaveBeenCalledWith({ fullPage: true });
      expect(close).toHaveBeenCalledOnce();
      expect(result).to.equal(expectedBuffer);

      connectSpy.mockRestore();
    });

    test("forwards the proxy option into the connect URL used for the browser session", async () => {
      const page = {
        goto: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockResolvedValue(Buffer.from("x")),
      };
      const connect = vi.fn().mockResolvedValue({
        pages: vi.fn().mockResolvedValue([page]),
        close: vi.fn().mockResolvedValue(undefined),
      });

      const puppeteer = await import("puppeteer-core");
      const connectSpy = vi
        .spyOn(puppeteer.default, "connect")
        .mockImplementation(connect);

      await browser.screenshot("https://example.com", {
        proxy: { location: ProxyCountry.US },
      });

      expect(connectSpy).toHaveBeenCalledWith({
        browserWSEndpoint:
          "wss://browser.zenrows.com?apikey=test&proxy_country=us",
      });

      connectSpy.mockRestore();
    });
  });
});
