# Installing the Teacher PWA on Mobile (Dev Mode)

PWAs require **HTTPS** for service worker registration and the "Add to Home Screen" install prompt. During development, your phone cannot install a PWA served over plain `http://`. This guide covers two approaches to serve the PWA over HTTPS so your phone can install and use it **like a native app** (fullscreen, home screen icon, no browser chrome — just like Flutter).

---

## Option A: Cloudflare Tunnel (Recommended)

**Zero config. No IP. No certificates. Real HTTPS.** This is the best approach for both daily development with hot reload and mobile installation testing.

### Choose Your Mode: Hot Reloading vs. Service Worker Testing

#### 1. Live Hot Reloading Development Mode (`start:dev:tunnel`)

Use this when writing code, tweaking UI, and testing layouts simultaneously on your PC and mobile phone:

```bash
# Make sure the NestJS backend is running on port 3000 first
npm run start:dev:tunnel
```

- **Live Hot Reloading (HMR)**: Whenever you save any `.ts`, `.html`, or `.scss` file in VS Code, **both your PC browser and your mobile phone screen will automatically reload in under 1 second** to reflect changes instantly!
- **No manual rebuilding required**.

#### 2. Standalone PWA & Service Worker Mode (`serve:pwa:tunnel`)

Use this when verifying native app installation, offline behavior, and Angular Service Worker (`ngsw`) caching:

```bash
npm run serve:pwa:tunnel
```

- Builds the production bundle (`ng build`) once and serves static files.
- Note: Because it serves compiled static files, code edits require restarting this command.

### Why Does the Quick Tunnel URL Change? (`trycloudflare.com`)

When using quick tunnels (`--url http://localhost:4200`), Cloudflare assigns a temporary, anonymous subdomain (`https://<random-words>.trycloudflare.com`). Every time you stop (`Ctrl+C`) and restart the terminal command, Cloudflare closes the old temporary URL and generates a **new random URL**.

- **To find your current active link**: Look at the terminal tab running your tunnel command right below `Your quick Tunnel has been created! Visit it at:`.

### How to Get a Permanent, Fixed URL That Never Changes

If you want a fixed link that stays the same every day across PC restarts:

1. **Option 1: Cloudflare Named Tunnel (Free & Permanent)**
   - Create a free Cloudflare account and install `cloudflared login`.
   - Create a permanent named tunnel bound to a domain or subdomain you own (e.g., `https://teacher-dev.yourdomain.com`).
2. **Option 2: LAN Dev Certificate (Local Network)**
   - Run `npm run generate:dev-cert` and `npm run serve:pwa:https`.
   - Your phone accesses the PC's local IP address (`https://192.168.x.x:4200`). As long as your PC's IP address remains constant on the Wi-Fi network, the URL never changes.

### Install on Your Phone (Native App Experience)

1. Open **Chrome** on your Android phone (or **Safari** on iPhone/iPad)
2. Paste your active `https://....trycloudflare.com` URL
3. Wait for the page to load fully (~5 seconds)
4. Chrome shows an **"Install app"** or **"Add to Home Screen"** banner at the bottom
   - If the banner doesn't appear, tap Chrome's **⋮ menu → "Install app"** (or Safari's **Share icon → "Add to Home Screen"**)
5. The app icon appears on your home screen
6. Tap the icon — it launches **fullscreen in standalone mode**, exactly like a native Flutter app!

### Why This Is Best

- **No IP dependency** — works regardless of your computer's IP address
- **Real HTTPS certificate** — no browser warnings, no security compromises
- **Works across networks** — test from anywhere, not just your LAN
- **Secure** — the tunnel is encrypted end-to-end; Cloudflare doesn't see your data

### Limitations

- Requires internet on both PC and phone
- URL changes each time you restart the tunnel
- Slightly slower than direct LAN (traffic routes through Cloudflare)

---

## Option B: Self-Signed HTTPS (Offline / LAN Fallback)

Use this when you have no internet or need the fastest possible connection.

### 1. Generate the Certificate

The cert uses your LAN IP in the Subject Alternative Name (SAN). **Regenerate if your IP changes.**

```bash
npm run generate:dev-cert
```

Or with a specific IP:

```bash
mkdir -p .dev-certs
openssl req -x509 -newkey rsa:2048 \
  -keyout .dev-certs/key.pem -out .dev-certs/cert.pem \
  -days 365 -nodes \
  -subj "/CN=PPVS-Dev-PWA" \
  -addext "subjectAltName=IP:YOUR_LAN_IP,DNS:localhost"
```

### 2. Serve Over HTTPS

```bash
npm run serve:pwa:https
```

### 3. Access from Your Phone

1. Open Chrome → `https://YOUR_LAN_IP:4200`
2. Tap **Advanced → Proceed to site** (one-time warning for self-signed cert)
3. Install via Chrome **⋮ menu → "Install app"**

### Note on IP Changes

If your IP changes frequently, regenerate the cert:

```bash
npm run generate:dev-cert
# Then restart:
npm run serve:pwa:https
```

The `.dev-certs/` directory is in `.gitignore` and never committed.

---

## Comparison

| Aspect            | Cloudflare Tunnel (A) | Self-Signed HTTPS (B)      |
| ----------------- | --------------------- | -------------------------- |
| IP dependency     | None                  | Must match cert SAN        |
| Certificate       | Real (no warnings)    | Self-signed (warning once) |
| Internet required | Yes                   | No                         |
| Speed             | Good (via Cloudflare) | Best (direct LAN)          |
| Setup             | Zero                  | Generate cert              |
| URL stability     | New URL each session  | Stable LAN IP              |
| Security          | End-to-end encrypted  | Encrypted on LAN           |

---

## The Native App Experience

Once installed via either method, the PWA behaves exactly like a Flutter or native app:

- **Home screen icon** with your app icon (from `manifest.webmanifest`)
- **Standalone mode** — no URL bar, no browser tabs, fullscreen UI
- **Splash screen** on launch with your theme color (`#facc15`)
- **Offline caching** via Angular service worker (`ngsw-worker.js`)
- **App switcher** shows it as a separate app, not a browser tab

The only difference from Flutter: you install via Chrome instead of the Play Store.

---

## Available Scripts

| Script                      | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `npm run serve:pwa`         | HTTP only (localhost testing, no mobile install) |
| `npm run serve:pwa:https`   | HTTPS via self-signed cert (LAN mobile install)  |
| `npm run serve:pwa:tunnel`  | HTTPS via Cloudflare tunnel (recommended)        |
| `npm run generate:dev-cert` | Regenerate self-signed SSL certificate           |

---

## Troubleshooting

### "Install app" option not appearing

- Ensure the page fully loads and wait ~10 seconds
- Check Chrome DevTools → Application → Manifest (no errors)
- Clear site data: Chrome → Settings → Site settings → find the URL → Clear & reset

### Service worker not registering

- Only registers over HTTPS or `localhost` — never plain HTTP
- Check DevTools → Application → Service Workers
- The Angular service worker is `enabled: !isDevMode()` — production builds (used by all `serve:pwa:*` scripts) enable it correctly

### Backend API calls failing

- Ensure the NestJS backend runs on port 3000 (`npm run start:dev` in `backend/`)
- All `serve:pwa:*` scripts proxy unmatched requests to `http://127.0.0.1:3000`

### Tunnel URL not appearing

- Ensure you have internet access
- Cloudflare may take 5-10 seconds to establish the tunnel
- Check the terminal output for the `https://....trycloudflare.com` URL
