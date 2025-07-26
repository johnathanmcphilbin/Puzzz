export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  
  // Direct path - let the browser handle it
  console.log('Loading cat image:', iconUrl);
  return iconUrl;
};