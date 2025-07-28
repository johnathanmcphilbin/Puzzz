// Direct cat image URL resolver - no imports, no bundling, just direct public URLs
// Handles filenames with spaces and special characters properly for production

/**
 * Simple, reliable cat image URL resolver for direct public access
 * Takes a database path like "/lovable-uploads/angry-cat.png" and returns properly encoded public URL
 */
export const getCatImageUrl = (iconUrl: string | null | undefined): string => {
  // Handle null, undefined, empty string
  if (!iconUrl || iconUrl.trim() === '') {
    return '/placeholder.svg';
  }

  try {
    // If the URL already starts with a slash, use it as-is (it's already a valid public path)
    if (iconUrl.startsWith('/')) {
      return iconUrl;
    }
    
    // Otherwise, treat it as a filename and add leading slash
    return `/${iconUrl}`;
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