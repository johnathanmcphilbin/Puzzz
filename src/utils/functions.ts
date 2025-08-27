export const FUNCTIONS_BASE_URL = `https://heqqjpxlithgoswwyjoi.functions.supabase.co`;
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcXFqcHhsaXRoZ29zd3d5am9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODYzOTEsImV4cCI6MjA2ODA2MjM5MX0.93khyYHQ_XrTH5S-qyK5UA6mT94CEYz7quEhn9kx1X0';

// Deep merge utility for nested objects (arrays are replaced, not merged)
export function safeDeepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  if (!source || typeof source !== 'object') return target;
  const output: any = Array.isArray(target)
    ? [...(source as any)]
    : { ...target };

  for (const key of Object.keys(source)) {
    const sVal: any = (source as any)[key];
    const tVal: any = (target as any)[key];

    if (Array.isArray(sVal)) {
      output[key] = [...sVal];
    } else if (sVal && typeof sVal === 'object' && !Array.isArray(sVal)) {
      output[key] = safeDeepMerge(
        tVal && typeof tVal === 'object' ? tVal : {},
        sVal
      );
    } else {
      output[key] = sVal;
    }
  }

  return output as T;
}
