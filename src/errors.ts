export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export const MissingAPIKeyError = new ConfigurationError(
  "An API key is required to use the ZenRows Scraping Browser API",
);
