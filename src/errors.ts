/**
 * Any call that didn't return a result: a non-2xx answer from the API, or a failure on the way
 * (network, timeout), with `status` 0 for the latter.
 *
 * `code` is the API's own (`login`, `invalid_key`, `no_credits`, `quota_exceeded`, `daily_limit`,
 * `rate_limited`, `busy`, `unavailable`, `timeout`...), or one of the client's: `network_error`,
 * `client_timeout`, `aborted`, `invalid_response`, `unresolved`.
 */
export class IrisError extends Error {
  /** HTTP status, or 0 when no answer came back. */
  readonly status: number;
  /** A code to act on, when the API (or the client) gives one. */
  readonly code?: string;
  /** Seconds to wait before trying again, when known (429 and 503). */
  readonly retryAfter?: number;
  /** The parsed JSON body (or the raw text) of the answer. */
  readonly body?: unknown;

  constructor(
    message: string,
    init: { status: number; code?: string; retryAfter?: number; body?: unknown; cause?: unknown },
  ) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = "IrisError";
    this.status = init.status;
    if (init.code !== undefined) this.code = init.code;
    if (init.retryAfter !== undefined) this.retryAfter = init.retryAfter;
    if (init.body !== undefined) this.body = init.body;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** True for errors worth retrying as is, later: 429, 5xx, network failures and timeouts. */
  get retryable(): boolean {
    if (this.status === 0) return this.code !== "aborted" && this.code !== "unresolved";
    return this.status === 429 || this.status >= 500;
  }
}
