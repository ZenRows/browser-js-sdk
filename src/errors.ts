export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ParameterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParameterValidationError";
  }
}

export const MissingAPIKeyError = new ConfigurationError(
  "An API key is required to use the ZenRows Scraping Browser API",
);
