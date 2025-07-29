# Cat Characters

This folder contains all the cat character images for the game.

## 🐱 **How it works:**
- All cat images should be placed directly in this `public/cats/` folder
- Images are served as static assets and work consistently in both development and production
- Supports both JPG and PNG formats
- **Important:** Use dashes instead of spaces in filenames (e.g., `my-cat.png` not `my cat.png`)
- Cat character data is stored in the database for dynamic management

## 📁 **Current cats:**
All cat images are present and loaded from the database:
- angry-cat.png
- auracat.png  
- ballet-cat.jpg
- chill-cat.jpg
- dino-cat.jpg
- drum-cat.png
- flower-cat.jpg
- french-cat.jpg
- glass-cat.png
- happy-cat.png
- jumper-cat.jpg
- king-cat.jpg
- lil-cat.png
- milk-cat.jpg
- orange-cat.png
- pirate-cat.png
- robo-arm-cat.png
- science-cat.jpg
- sick-cat.jpg
- silly-cat.jpg
- tomato-cat.jpg
- tuff-cat.jpg

## ➕ **Adding new cats:**

### Method 1: File + Code (Simple)
1. Name your file using dashes instead of spaces (e.g., `cool-cat.png`)
2. Drop your image file (PNG or JPG) directly into this folder
3. Use the `addCatCharacter()` function in your code:

```javascript
import { addCatCharacter } from '@/utils/catManagement';

await addCatCharacter({
  name: "Cool Cat",
  icon_url: "cool-cat.png"  // Just the filename
});
```

### Method 2: Database Migration (Bulk)
1. Add your image files to this folder
2. Create a new migration file with INSERT statements
3. Run the migration to add multiple cats at once

## 🚀 **For developers:**
- Images in this folder work on both localhost and deployed websites
- No spaces in filenames = no URL encoding issues
- Cat data is stored in `cat_characters` database table
- The `getCatImageUrl()` function handles all path resolution
- User uploads go to `/lovable-uploads/` and are handled automatically
- Use `src/utils/catManagement.ts` for programmatic cat management