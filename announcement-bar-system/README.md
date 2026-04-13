# Announcement Bar (Express + React)

## Folder structure

```txt
announcement-bar-system/
  server/
    data/announcements.json
    src/server.js
    src/store.js
    package.json
  client/
    src/components/AdminForm.jsx
    src/components/AnnouncementBar.jsx
    src/components/AnnouncementRenderer.jsx
    src/api.js
    src/App.jsx
    src/main.jsx
    index.html
    vite.config.js
    package.json
```

## Run

1. Start backend

```bash
cd server
npm install
npm run dev
```

2. Start frontend

```bash
cd client
npm install
npm run dev
```

3. Open `http://localhost:5174`

## Implemented requirements

- Admin form to create announcement bars
- Fields: text, background color, text color, optional button text/link
- Data persisted in JSON (`server/data/announcements.json`)
- Unique ID generated with `crypto.randomUUID()`
- API endpoint: `GET /announcement/:id`
- Default fallback announcement when ID not found
- Reusable React renderer by announcement ID
- Loading state and error fallback UI
- Block/section style integration using ID input and component prop
