# Dining Philosophers Simulation

Interactive visualization of the Dining Philosophers concurrency problem with:

- Manual stepping per philosopher
- Auto mode execution
- Naive vs Asymmetric strategy comparison
- Deadlock detection banner and counter
- Live state matrix, arrays, event stream, and metrics

## Project Files

- `index.html` - Main app UI + simulation logic
- `style.css` - Legacy stylesheet (not required by current inline UI)
- `simulation.js` - Legacy script file (not required by current inline UI)
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## Run Locally

Open `index.html` directly in your browser.

## Controls

- `START / PAUSE` - Start or pause simulation
- `RESET` - Reset all states
- `AUTO` - Let simulation run automatically
- Philosopher count selector - Choose `3`, `4`, or `5`
- Strategy selector:
  - `Naive (Deadlock Prone)`
  - `Asymmetric (Safe)`

## Git Setup in This Folder

A dedicated git repo is initialized in this folder.

Recent commits include:

1. UI/layout/theme updates
2. GitHub Pages workflow

## Push to GitHub

Current remote:

- `https://github.com/itshaurya055-glitch/Dinning_philospher.git`

If push fails with 403, authenticate using a GitHub account that has write access to the repo.

Then run:

```bash
git -C c:/Users/ASUS/Desktop/dinning_simulation push -u origin master
```

## Deploy to GitHub Pages

Deployment workflow is already included at:

- `.github/workflows/deploy-pages.yml`

After successful push:

1. Go to repository `Settings > Pages`
2. Ensure source is set to `GitHub Actions`
3. Wait for workflow run to finish
4. Your site URL will appear in the Pages settings and Actions logs

## Notes

- This project currently keeps CSS and JavaScript inline in `index.html` for simplicity.
- `style.css` and `simulation.js` can be removed later, or the app can be refactored to use them externally.
