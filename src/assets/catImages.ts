// Direct cat image URL resolver - no imports, no bundling, just direct public URLs
// Handles filenames with spaces and special characters properly for production

/**
 * Simple, reliable cat image URL resolver for direct public access
 * Takes a database path like "/cats/Angry cat.png" and returns properly encoded public URL
 */
export const getCatImageUrl = (iconUrl: string | null | undefined): string => {
  // Handle null, undefined, empty string
  if (!iconUrl || iconUrl.trim() === '') {
    return '/placeholder.svg';
  }

  try {
    // Remove leading slash if present and ensure we're looking at cats folder
    const cleanPath = iconUrl.startsWith('/') ? iconUrl.substring(1) : iconUrl;
    
    // If it doesn't start with 'cats/', add it
    const fullPath = cleanPath.startsWith('cats/') ? cleanPath : `cats/${cleanPath}`;
    
    // Split path and encode each component separately to handle spaces and special characters
    const pathParts = fullPath.split('/').filter(part => part.length > 0);
    const encodedParts = pathParts.map(part => encodeURIComponent(part));
    const encodedPath = encodedParts.join('/');
    
    // Return direct public URL
    return `/${encodedPath}`;
  } catch (error) {
    console.warn('Error processing cat image URL:', iconUrl, error);
    return '/placeholder.svg';
  }
};

/**
 * Alternative simple resolver that assumes all images are in /public/cats/
 * and just needs proper encoding
 */
export const getDirectCatImageUrl = (filename: string): string => {
  if (!filename || filename.trim() === '') {
    return '/placeholder.svg';
  }
  
  try {
    // Extract just the filename if a full path was provided
    const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;
    
    if (!justFilename) {
      return '/placeholder.svg';
    }
    
    // Encode the filename to handle spaces and special characters
    const encodedFilename = encodeURIComponent(justFilename);
    
    return `/cats/${encodedFilename}`;
  } catch (error) {
    console.warn('Error processing direct cat image URL:', filename, error);
    return '/placeholder.svg';
  }
};

// Keep this for backward compatibility but mark as deprecated
export const CAT_IMAGE_REGISTRY: Record<string, string> = {};

export const getAllCatImages = () => {
  console.warn('getAllCatImages is deprecated - use direct public URLs instead');
  return [];
};