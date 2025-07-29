# Cat Characters

This folder contains all the cat character images for the game.

## 🐱 **How it works:**
- All cat images should be placed directly in this `public/cats/` folder
- Images are served as static assets and work consistently in both development and production
- Supports both JPG and PNG formats
- User uploads are handled separately in `/lovable-uploads/`

## 📁 **Current cats:**
All cat images are already present and ready to use:
- Angry cat.png
- auracat.png  
- Ballet cat.jpg
- Chill cat.jpg
- Dino cat.jpg
- Drum cat.png
- Flower cat.jpg
- French cat.jpg
- Glass cat.png
- Happy cat.png
- Jumper cat.jpg
- King cat.jpg
- Lil Cat.png
- Milk cat.jpg
- Orange cat.png
- Pirate cat.png
- Robo arm cat.png
- Science cat.jpg
- Sick cat.jpg
- Silly cat.jpg
- Tomato cat.jpg
- Tuff cat.jpg

## ➕ **Adding new cats:**
1. Drop your image file (PNG or JPG) directly into this folder
2. Update `src/assets/catImages.ts` to add your cat to the `STATIC_CATS` array
3. The image will be automatically accessible at `/cats/your-filename.ext`

## 🚀 **For developers:**
- Images in this folder work on both localhost and deployed websites
- No need to import images as ES6 modules
- The `getCatImageUrl()` function handles all path resolution
- User uploads go to `/lovable-uploads/` and are handled automatically