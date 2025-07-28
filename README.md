# Party Puzzle Palooza

An online party-game platform where friends can join rooms and compete in real-time puzzle rounds. The project is built with React, Vite, TypeScript, Tailwind CSS, shadcn-ui, and Supabase Edge Functions.

---

## 📑 Table of Contents
1. [Getting Started](#getting-started)
2. [Project Scripts](#project-scripts)
3. [Environment Variables](#environment-variables)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Supabase Functions](#supabase-functions)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

---

## Getting Started

### Prerequisites
* **Node.js ≥ 18** – recommended to install via [`nvm`](https://github.com/nvm-sh/nvm)
* **npm ≥ 9** (or [Bun](https://bun.sh/) if you prefer – just replace the npm commands below)
* **Supabase CLI** *(optional but recommended)* – for running the database & edge functions locally

### Installation
```bash
# 1. Clone the repo
$ git clone <your_git_url>
$ cd party-puzzle-palooza

# 2. Install dependencies
$ npm i


# 4. Start the dev server
$ npm run dev
# Vite will automatically open http://localhost:5173
```

---

## Project Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite in development mode with hot-reload |
| `npm run build` | Production build (to `dist/`) |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on the entire codebase |

---

## Environment Variables
Create a `.env` (or `.env.local`) file in the project root.

```env
VITE_SUPABASE_URL="https://<project>.supabase.co"
VITE_SUPABASE_ANON_KEY="<public-anon-key>"
```

Add any additional variables your Supabase functions or integrations need.

---

## Tech Stack
* **React 18** & **Vite 5** – lightning-fast dev experience
* **TypeScript** – type-safe development
* **Tailwind CSS** & **shadcn-ui** – modern UI components & utility-first styling
* **@tanstack/react-query** – remote data management
* **Three.js** (`@react-three/fiber`) – 3D visuals & animations
* **Supabase** – database, auth, storage & edge functions
* **ESLint** & **Prettier** – code quality & formatting

---

## Project Structure
```text
├── public/            # Static assets served as-is
├── src/
│   ├── components/    # Re-usable UI components
│   ├── pages/         # Route-level components (via react-router)
│   ├── hooks/         # Custom React hooks
│   ├── integrations/  # 3rd-party integrations---

## Supabase Functions
Edge functions live in `supabase/functions/`.

```bash
# start local supabase stack (database + studio + edge runtime)
$ supabase start

# serve a specific edge function (example: ai-chat)
$ supabase functions serve ai-chat --watch
```

Refer to the Supabase docs for more CLI options and deployment instructions.

---

## Deployment
This project is hosted on **Lovable**. From the project dashboard choose **Share → Publish** to deploy the latest build.

If you prefer your own infrastructure, you can deploy the static `dist/` folder to any CDN (e.g. Vercel, Netlify, Cloudflare Pages) and your Supabase project will continue to serve the API layer.

---

Happy puzzing! 🧩
