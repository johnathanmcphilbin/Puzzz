export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  // Since images are in public/cats/, they're served directly from the root
  return iconUrl;
};