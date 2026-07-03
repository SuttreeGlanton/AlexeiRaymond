export function withBase(path = ''): string {
  const value = String(path || '');

  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('#')) {
    return value;
  }

  const rawBase = import.meta.env.BASE_URL || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const clean = value.replace(/^\/+/, '');
  return `${base}${clean}`;
}

export function assetPath(path = ''): string {
  return withBase(path);
}
