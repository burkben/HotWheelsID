export interface RetryPolicy {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly maxRetries: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  baseDelayMs: 1_000,
  maxDelayMs: 8_000,
  maxRetries: 3,
};

/**
 * Delay before retry number `attempt`, or `null` once the finite retry budget is
 * exhausted. Attempt zero is the first retry after the initial failure.
 */
export function retryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): number | null {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= policy.maxRetries) return null;
  return Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs);
}
