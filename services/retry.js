const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async (
  operation,
  {
    retries = 2,
    baseDelayMs = 300,
    shouldRetry = (error) => Boolean(error?.isTransient),
  } = {}
) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = attempt < retries && shouldRetry(error);

      if (!canRetry) {
        throw error;
      }

      const delay = baseDelayMs * (attempt + 1);
      await wait(delay);
      attempt += 1;
    }
  }

  throw new Error('Retry operation exhausted unexpectedly.');
};
