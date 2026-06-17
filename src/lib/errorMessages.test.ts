import { describe, it, expect } from 'vitest';
import { toUserMessage, TOO_MANY_RESULTS } from './errorMessages.js';

const TOO_MANY_COPY =
  'Your query is too broad. Please narrow the date range or raise the minimum magnitude.';
const INVALID_COPY = 'The request was invalid. Check your filters and try again.';
const FALLBACK_COPY = 'Please try again in a few minutes.';

describe('toUserMessage', () => {
  it('maps TOO_MANY_RESULTS to the too-broad copy', () => {
    expect(toUserMessage(TOO_MANY_RESULTS)).toBe(TOO_MANY_COPY);
  });

  it('maps a nonRetryable error to the invalid-request copy', () => {
    const err = Object.assign(new Error('HTTP 400'), { nonRetryable: true });
    expect(toUserMessage(err)).toBe(INVALID_COPY);
  });

  it('maps a TypeError (network failure) to the fallback copy', () => {
    expect(toUserMessage(new TypeError('Network failure'))).toBe(FALLBACK_COPY);
  });

  it('maps an HTTP 500 error (no nonRetryable) to the fallback copy', () => {
    const err = Object.assign(new Error('HTTP 500'), { status: 500 });
    expect(toUserMessage(err)).toBe(FALLBACK_COPY);
  });

  it('maps null to the fallback copy', () => {
    expect(toUserMessage(null)).toBe(FALLBACK_COPY);
  });

  it('maps an unknown plain object to the fallback copy', () => {
    expect(toUserMessage({ something: 'unexpected' })).toBe(FALLBACK_COPY);
  });

  it('does not match TOO_MANY_RESULTS by structure — identity check only', () => {
    expect(toUserMessage({ code: 'TOO_MANY_RESULTS' })).toBe(FALLBACK_COPY);
  });
});
