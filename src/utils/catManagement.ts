import { supabase } from '@/integrations/supabase/client';

export interface NewCatCharacter {
  name: string;
  icon_url: string;
  description?: string;
  stats?: {
    speed: number;
    stealth: number;
    charisma: number;
    strength: number;
    intelligence: number;
  };
}

/**
 * Add a new cat character to the database
 * @param cat - The cat character data
 * @returns Promise with the created cat or error
 */
export async function addCatCharacter(cat: NewCatCharacter) {
  try {
    // Ensure the filename uses dashes instead of spaces
    let cleanIconUrl = cat.icon_url;
    if (
      cleanIconUrl &&
      !cleanIconUrl.startsWith('http') &&
      !cleanIconUrl.startsWith('/')
    ) {
      // If it's just a filename, ensure it uses dashes and add /cats/ prefix
      cleanIconUrl = `/cats/${cleanIconUrl.replace(/\s+/g, '-')}`;
    }

    const { data, error } = await supabase
      .from('cat_characters')
      .insert([
        {
          name: cat.name,
          icon_url: cleanIconUrl,
          description: cat.description || `A wonderful cat named ${cat.name}`,
          stats: cat.stats || {
            speed: 2,
            stealth: 2,
            charisma: 2,
            strength: 2,
            intelligence: 2,
          },
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding cat character:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error adding cat character:', error);
    return { success: false, error: 'Failed to add cat character' };
  }
}

/**
 * Get all cat characters from the database
 */
export async function getAllCatCharacters() {
  try {
    const { data, error } = await supabase
      .from('cat_characters')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching cat characters:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching cat characters:', error);
    return { success: false, error: 'Failed to fetch cat characters' };
  }
}

/**
 * Example usage:
 *
 * // Add a new cat with just a name and filename
 * await addCatCharacter({
 *   name: "Cool Cat",
 *   icon_url: "cool-cat.png"  // File should be in public/cats/
 * });
 *
 * // Add a cat with custom stats
 * await addCatCharacter({
 *   name: "Super Cat",
 *   icon_url: "super-cat.jpg",
 *   description: "A heroic feline with amazing powers",
 *   stats: { speed: 5, stealth: 3, charisma: 4, strength: 5, intelligence: 4 }
 * });
 */
