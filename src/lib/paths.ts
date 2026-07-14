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

export function absoluteSiteUrl(path = '', site?: URL | string): string {
  const value = String(path || '');

  if (!site) return withBase(value);
  if (/^(?:https?:)?\/\//i.test(value)) return new URL(value, site).toString();

  const rawBase = import.meta.env.BASE_URL || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const baseAwarePath = value.startsWith(base) ? value : withBase(value);

  return new URL(baseAwarePath, site).toString();
}
