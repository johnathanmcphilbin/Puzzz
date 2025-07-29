# Cat Characters

This folder contains all the cat character images for the game.

## 🐱 **How it works:**
- All cat images should be placed directly in this `public/cats/` folder
- Images are served as static assets and work consistently in both development and production
- Supports both JPG and PNG formats
- User uploads are handled separately in `/lovable-uploads/`
- **Important:** Use dashes instead of spaces in filenames (e.g., `my-cat.png` not `my cat.png`)

## 📁 **Current cats:**
All cat images are already present and ready to use:
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
1. Name your file using dashes instead of spaces (e.g., `cool-cat.png`)
2. Drop your image file (PNG or JPG) directly into this folder
3. Update `src/assets/catImages.ts` to add your cat to the `STATIC_CATS` array
4. The image will be automatically accessible at `/cats/your-filename.ext`

## 🚀 **For developers:**
- Images in this folder work on both localhost and deployed websites
- No spaces in filenames = no URL encoding issues
- The `getCatImageUrl()` function handles all path resolution
- User uploads go to `/lovable-uploads/` and are handled automatically