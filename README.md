# Habits

A personal habit tracker for [lordofblackwood](https://github.com/lordofblackwood). Check in daily, meet weekly targets, and climb the same divisions as the gym tracker.

The app runs entirely in your browser. Your habits and check-ins stay on your device; there is no account or server. Use Configure to export a backup or import one on another device. Browser data can be cleared, so export a backup periodically. Data is separate for each browser and device.

## Your starting routine

| Habit | Weekly target |
| --- | ---: |
| Gym | 4 |
| Bible reading | 7 |
| Agpeya | 7 |
| Daily walk | 7 |
| Running | 3 |
| Writing | 1 |
| Creative pursuit | 1 |

Open Configure to rename, reorder, add, archive, restore, or change a habit and its weekly target. Schedule changes preserve completed weeks, so your history keeps the target that applied at the time.

## Divisions

Your division reflects consistency over the last **12 full weeks**, excluding the current week. Each habit contributes equally: its completed check-ins divided by its target, capped at 100%. Daily habits do not outweigh weekly habits. Start at **Unranked** until your first check-in.

| Division | Score from |
| --- | ---: |
| Iron | 0% |
| Bronze | 15% |
| Silver | 30% |
| Gold | 45% |
| Platinum | 60% |
| Emerald | 70% |
| Diamond | 85% |
| Master | 95% |
| Grandmaster | 98% |
| Challenger | 100% |

Iron through Diamond have four subdivisions, **IV → III → II → I**, with LP showing your progress within the subdivision. Master, Grandmaster, and Challenger stand on their own.

## Install and use offline

After opening the app once while connected, it can run offline. In Chrome or Edge, use the browser's install option. On iPhone or iPad, open it in Safari, choose Share, then Add to Home Screen. Updates are downloaded in the background and the app offers a reload when one is ready. Check-ins are saved before reloading.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The production build generates an offline cache containing every built asset, including fonts. Use the production preview to test installation and offline behavior. The service worker is scoped to this app and only removes its own old caches.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds, and deploys `main` using the official GitHub Pages actions. In the repository's **Settings → Pages**, set the deployment source to **GitHub Actions**.

The intended address is [lordofblackwood.github.io/habit-divisions](https://lordofblackwood.github.io/habit-divisions/). All asset and manifest paths are relative, so the app also works under a different Pages subdirectory. No secrets are required.

Deployment setup follows the [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages). Offline installation and updates follow the [service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
