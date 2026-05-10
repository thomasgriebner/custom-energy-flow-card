const CACHE_SIZE = 10;

export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyFn: (...args: Args) => string,
): (...args: Args) => R {
  const cache = new Map<string, R>();
  return (...args: Args): R => {
    const key = keyFn(...args);
    if (cache.has(key)) {
      // Map.get returns R | undefined; cache.has guards above guarantees it's R.
      const value = cache.get(key) as R;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    const value = fn(...args);
    cache.set(key, value);
    if (cache.size > CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return value;
  };
}
