export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) {
    console.log('No iconUrl provided, returning placeholder');
    return '/placeholder.svg';
  }
  
  console.log('Original iconUrl:', iconUrl);
  console.log('Testing direct path access...');
  
  // Test the original path first
  const originalPath = iconUrl;
  console.log('Trying original path:', originalPath);
  
  // Also try URL encoded version
  const encodedPath = iconUrl.replace(/ /g, '%20');
  console.log('Trying encoded path:', encodedPath);
  
  // For debugging, let's try both approaches
  const img = new Image();
  img.onload = () => console.log('✅ Image loaded successfully:', originalPath);
  img.onerror = () => {
    console.log('❌ Image failed to load:', originalPath);
    // Try encoded version
    const imgEncoded = new Image();
    imgEncoded.onload = () => console.log('✅ Encoded image loaded successfully:', encodedPath);
    imgEncoded.onerror = () => console.log('❌ Encoded image also failed:', encodedPath);
    imgEncoded.src = encodedPath;
  };
  img.src = originalPath;
  
  // Return the encoded version for production
  return encodedPath;
};