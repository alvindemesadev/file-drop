# FileDrop

Share files over a local network. Upload through a browser, get a link and a 6-digit code. The other side enters the code or scans a QR screenshot to download. No sign-up, no cloud, no data leaves your LAN.

Everything runs on your machine — SQLite for metadata, disk for storage, the zip is built on upload so the receiver downloads one file regardless of how many were selected.

---

## Features

- **Drag-and-drop upload** with client-side reordering; files are zipped in the order you arrange them
- **6-digit access codes** as a quick alternative to sharing the full URL
- **QR code scanning** from a saved screenshot — no camera required, works over plain HTTP
- **Password protection** with SHA-256 hashing, optional per transfer
- **Auto-expiry** from 1 hour to 7 days; expired files are cleaned up automatically
- **Real-time countdown** showing how long a share has left
- **Toast notifications** for every success and failure state
- **Dark/light theme** with localStorage persistence and a pre-hydration script that prevents flash
- **Mobile-responsive** layout, works on phones and tablets on the same network

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui (base-nova), Tailwind CSS v4 |
| Icons | Lucide React |
| Database | SQLite via better-sqlite3 |
| Archiving | archiver (zip on upload) |
| QR (encode) | qrcode |
| QR (decode) | jsQR |
| Toasts | sonner |
| Language | TypeScript |

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3001` (or whatever port the terminal shows) on any device connected to the same network.

To share from a specific LAN IP, the dev server already advertises the network URL in the terminal output.

### Production on LAN

```bash
npm run serve
```

Builds and starts on the first available port starting at 3001. Other devices connect to `http://<YOUR_LAN_IP>:<PORT>` (the port is printed in the terminal).

To use a different starting port:

```bash
PORT=8080 npm run serve    # Mac/Linux
$env:PORT=8080; npm run serve  # Windows PowerShell
```

### Auto-start on Windows (PM2)

To keep FileDrop running in the background across reboots without a terminal window:

```bash
# Install PM2 globally
npm install -g pm2

# Build for production
npm run build

# Start Next.js directly via PM2 (port 3001)
pm2 start node_modules/next/dist/bin/next --name file-drop -- start -H 0.0.0.0 -p 3001

# Save the process list for resurrect on boot
pm2 save

# Create a silent startup script (Windows only)
$startup = [Environment]::GetFolderPath('Startup')
Set-Content "$startup\file-drop.vbs" 'CreateObject("WScript.Shell").Run "cmd /c pm2 resurrect", 0, False'
```

The server will start automatically when you log in, running in the background with no visible terminal.

**Useful PM2 commands:**

| Command | Purpose |
|---------|---------|
| `pm2 status` | Check if FileDrop is running |
| `pm2 logs file-drop` | View server logs |
| `pm2 restart file-drop` | Restart after updates |
| `pm2 delete file-drop` | Stop and remove |
| `pm2 save` | Save current process list for resurrect |

## Usage

### Sending files

1. Open the app and click **I'm a Sender**
2. Drag files onto the drop zone, or tap to browse. Drag individual files to reorder them — the zip preserves your order
3. Optionally set an expiry time and a password
4. Click **Upload** — a progress bar shows speed and ETA
5. After upload completes, a share card shows:
   - A direct download link (copy with one click)
   - A 6-digit access code for verbal/chat sharing
   - A QR code the receiver can screenshot and scan

### Receiving files

- **Via link** — open the download URL in any browser
- **Via code** — go to **I'm a Receiver**, enter the 6-digit code, and tap **Look up**. If found, you're redirected to the download page
- **Via QR** — in the same receive screen, upload a screenshot of the QR code. The page decodes it and redirects you

If the sender set a password, you'll be prompted before the download starts.

### API

All endpoints return HTTP 200 with a JSON body — even "not found" and "expired" states. This keeps browser devtools free of spurious 4xx/5xx entries.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/upload` | Upload files (multipart/form-data). Returns `{ id, accessCode, downloadUrl, expiresAt }` |
| GET | `/api/files/[id]` | Download the zip. Optional `?password=` query param |
| GET | `/api/files/[id]/check` | Check file metadata (name, size, password required, expiry) |
| GET | `/api/files/[id]/verify` | Verify a password. Returns `{ valid: boolean }` |
| GET | `/api/code/[code]` | Look up a file by its 6-digit access code. Returns `{ found, id }` or `{ found: false, error }` |
| GET | `/api/cleanup` | Delete expired files from disk and database. Returns `{ deleted }` |

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing — "I'm a Sender" / "I'm a Receiver"
│   ├── layout.tsx               # Root layout: header, theme toggle, Toaster
│   ├── upload/page.tsx           # Upload form wrapper
│   ├── receive/page.tsx          # Code entry + QR upload, dual card layout
│   └── download/[id]/
│       └── FileDownload.tsx      # Download page (loading, password, stream)
│   └── api/
│       ├── upload/route.ts        # POST handler for file uploads
│       ├── code/[code]/route.ts   # 6-digit code lookup
│       ├── files/[id]/route.ts    # File download stream
│       ├── files/[id]/check/route.ts
│       ├── files/[id]/verify/route.ts
│       └── cleanup/route.ts      # Expired file cleanup
├── components/
│   ├── FileUpload.tsx             # Drag-drop, ordering, progress, share card
│   ├── ShareCard.tsx              # Post-upload: link, code, QR
│   ├── QRCodeDisplay.tsx          # Canvas-based QR generation
│   ├── theme-provider.tsx         # Theme context with useSyncExternalStore
│   ├── mode-toggle.tsx            # Dark/light toggle button
│   ├── toaster.tsx                # Sonner Toaster wrapper
│   └── ui/                        # shadcn/ui primitives (button, card, input, etc.)
└── lib/
    ├── store.ts                   # SQLite schema, CRUD, access code generation
    ├── hooks.ts                   # useCountdown — real-time expiry display
    └── utils.ts                   # cn() utility
```

## Deployment

FileDrop is a standard Next.js application. Build and start for production:

```bash
npm run build
npm start
```

By default the production server listens on `http://localhost:3000`. Point a reverse proxy (nginx, Caddy) at it if you need HTTPS or a custom domain.

The SQLite database is stored in `data/files.db`. Uploaded files live in `uploads/`. Both are relative to the project root.

### Configuration

- **LAN host**: Update `next.config.ts` to change the allowed origin for uploads
- **Database location**: Modify `src/lib/store.ts` to change the DB path
- **Upload directory**: Modify `UPLOAD_DIR` in route handlers

## Security notes

- FileDrop is designed for **trusted local networks**. It is not hardened for public internet exposure
- Passwords are SHA-256 hashed before storage. This is fast (not bcrypt/argon2) because the threat model is casual LAN access, not brute-force attacks
- Access codes are 6 numeric digits — sufficient for accidental-discovery prevention on a LAN, not for security against a determined attacker
- No TLS by default. If you need HTTPS, put a reverse proxy in front
- Uploaded files are stored on disk as-is. No encryption at rest

## License

MIT
