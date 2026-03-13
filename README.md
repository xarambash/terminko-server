# terminko-server

Backend server for Terminko – appointment booking (hair salon, nail salon, etc.). Communicates with terminko_db and serves terminko-mobile and terminko-manager.

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Scripts

- `npm run dev` – development with auto-reload (port 5000)
- `npm run build` – compile TypeScript to `dist/`
- `npm run start` – run production build (run `npm run build` first)

## API

- `GET /health` – health check endpoint

## Tech stack

- Node.js, Express, TypeScript
