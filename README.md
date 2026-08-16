# Frontend — GitHub Pages

This folder is the static GitHub Pages frontend.

## Setup

1. Deploy the backend first.
2. Open `config.js`.
3. Replace:

   `https://CHANGE-ME.onrender.com`

   with your backend URL.

4. Upload the contents of this `frontend` folder to your GitHub repository.
5. In GitHub:
   - Settings
   - Pages
   - Build and deployment
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`

If you place the frontend files in a subfolder instead, publish that folder using your chosen Pages workflow.

The frontend itself does not fetch remote sites. It loads the backend `/view` endpoint inside the page.
