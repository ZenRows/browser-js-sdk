import { beforeEach, describe, expect, test } from "vitest";
import { MissingAPIKeyError } from "../../src/errors.js";
import { ScrapingBrowser } from "../../src/index.js";
import { ProxyCountry, ProxyRegion } from "../../src/types.js";

describe("ScrapingBrowser", () => {
  let browser: ScrapingBrowser;

  beforeEach(() => {
    browser = new ScrapingBrowser({ apiKey: "test" });
  });

  test("should throw if no apikey is configured", () => {
    expect(() => {
      new ScrapingBrowser();
    }).to.throw(MissingAPIKeyError);
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

  test("should return the api url with proxy country", () => {
    expect(
      browser.getConnectURL({
        proxy: { location: ProxyCountry.US },
      }),
    ).to.equal("wss://browser.zenrows.com?apikey=test&proxy_country=us");
  });

  test("should return the api url with proxy region", () => {
    expect(
      browser.getConnectURL({
        proxy: { location: ProxyRegion.Europe },
      }),
    ).to.equal("wss://browser.zenrows.com?apikey=test&proxy_region=europe");
  });
});
