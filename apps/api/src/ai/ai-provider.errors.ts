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
