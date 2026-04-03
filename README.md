# sfi-web

React frontend for the **Schedule Fragility Index (SFI) Engine**.

Built with Vite · React · Tailwind CSS · Recharts

---

## Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Framework   | React 18 + Vite         |
| Styling     | Tailwind CSS            |
| Charts      | Recharts                |
| Routing     | React Router v6         |
| Icons       | Lucide React            |
| Fonts       | DM Mono + IBM Plex Sans |

---

## Project Structure

```
sfi-web/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.jsx       # Sidebar + page shell
│   │   └── dashboard/
│   │       ├── SFIGauge.jsx        # Circular arc score gauge
│   │       ├── MetricsGrid.jsx     # 6 component metric cards
│   │       ├── FloatChart.jsx      # Float distribution bar chart
│   │       ├── TaskTable.jsx       # Sortable/filterable task table
│   │       └── ProgressPanel.jsx   # Overdue/late-start status
│   ├── pages/
│   │   ├── UploadPage.jsx          # CSV upload + options
│   │   ├── ReportPage.jsx          # Full analysis report
│   │   └── HistoryPage.jsx         # Snapshot trend table
│   ├── hooks/
│   │   └── useAnalysis.js          # Upload + analyze state hook
│   ├── lib/
│   │   ├── api.js                  # All API calls (one place)
│   │   └── utils.js                # Formatting + SFI risk bands
│   ├── App.jsx                     # Routes
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Tailwind + global styles
├── index.html
├── vite.config.js                  # Dev proxy → localhost:8000
├── tailwind.config.js
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
cd sfi-web
npm install
```

### 2. Run in development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

The Vite dev server proxies `/api/*` → `http://localhost:8000` automatically,
so you just need the `sfi-engine` FastAPI backend running on port 8000.

### 3. Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy anywhere static (Vercel, Netlify, etc.).

---

## Environment Variables

| Variable        | Default              | Description                        |
|----------------|----------------------|------------------------------------|
| `VITE_API_BASE` | `/api` (proxied)     | Backend API base URL in production |

Create a `.env.production` file:
```
VITE_API_BASE=https://your-api-domain.com
```

---

## Connecting to the SFI Engine

This frontend expects a FastAPI backend exposing:

| Method | Path       | Description                          |
|--------|------------|--------------------------------------|
| POST   | /analyze   | Upload CSV → returns AnalyzeResult   |
| GET    | /history   | Returns list of saved snapshots      |
| GET    | /health    | Health check                         |

See `src/lib/api.js` for the full expected response shapes.

---

## Design System

Colors, typography, and component classes are defined in:
- `tailwind.config.js` — color tokens and font families
- `src/index.css` — reusable component classes (`.panel`, `.btn-primary`, `.tag-critical`, etc.)

The design uses a dark industrial theme with amber accents, DM Mono for data/labels,
and IBM Plex Sans for body text.
