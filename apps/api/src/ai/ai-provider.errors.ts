// The provider answered, but not in the shape the caller asked for (e.g. non-JSON text in JSON
// mode). Distinct from transport/API failures raised by the SDK and from schema-validation
// failures of well-formed JSON, which the pipeline services handle separately.
export class AiProviderResponseError extends Error {
  readonly cause: unknown;

  constructor(message: string, options: { cause: unknown }) {
    super(message);
    this.name = 'AiProviderResponseError';
    this.cause = options.cause;
  }
}

// The model stopped because it hit the output-token cap, so the text is cut off mid-answer.
export class AiProviderTruncatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderTruncatedError';
  }
}

// The model declined to answer (message.refusal is set); content, if any, is not a real result.
export class AiProviderRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderRefusalError';
  }
}

// The call finished normally but returned no text.
export class AiProviderEmptyResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderEmptyResponseError';
  }
}
