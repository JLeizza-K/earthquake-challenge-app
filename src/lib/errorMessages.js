export const TOO_MANY_RESULTS = { code: 'TOO_MANY_RESULTS' };

// Display label for a datum with no magnitude — NOT a fetch error; never goes through
// toUserMessage and never affects the app status state machine.
export const MSG_MAGNITUDE_UNAVAILABLE = 'Magnitude data unavailable';

const MSG_TOO_MANY =
  'Your query is too broad. Please narrow the date range or raise the minimum magnitude.';
const MSG_INVALID = 'The request was invalid. Check your filters and try again.';
const MSG_FALLBACK = 'Please try again in a few minutes.';

export function toUserMessage(error) {
  if (error === TOO_MANY_RESULTS) return MSG_TOO_MANY;
  if (error?.nonRetryable) return MSG_INVALID;
  return MSG_FALLBACK;
}
