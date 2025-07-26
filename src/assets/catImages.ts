export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  
  // URL encode the path to handle spaces and special characters
  // Split by '/' to only encode the filename part
  const pathParts = iconUrl.split('/');
  const encodedPath = pathParts.map((part, index) => {
    // Don't encode the first empty part or 'cats', only encode filenames
    if (index === 0 || part === 'cats') return part;
    return encodeURIComponent(part);
  }).join('/');
  
  console.log(`Original path: ${iconUrl}, Encoded path: ${encodedPath}`);
  return encodedPath;
};