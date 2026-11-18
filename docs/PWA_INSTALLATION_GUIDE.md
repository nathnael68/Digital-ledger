# Delgone Digital Sales Ledger — PWA Installation Guide

Delgone Trading PLC — Addis Ababa, Ethiopia  
Phase 6: Progressive Web App (PWA) Deployment

---

## 1. Overview

The **Delgone Digital Sales Ledger** is engineered as a Progressive Web App (PWA). When installed, it launches in **standalone mode** with a dedicated home screen icon, fullscreen app window (no browser address bar), and cached app shell for high-speed counter operation.

---

## 2. iPhone / iPad Installation (iOS Safari)

Apple iOS requires web applications to be served over **HTTPS** and installed via **Safari**.

### Step-by-Step Instructions:
1. Open **Safari** on your iPhone or iPad.
2. Navigate to the secure HTTPS application URL.
3. Tap the **Share** button at the bottom of the screen (the square icon with an upward-pointing arrow).
4. Scroll down the sharing options and tap **"Add to Home Screen"** (`+` icon).
5. Verify the title displays **"Delgone Ledger"** and the official Delgone Navy icon is visible.
6. Tap **Add** in the top-right corner.
7. Return to your home screen and tap the new **Delgone Ledger** icon to launch the application in standalone mode.

---

## 3. Android Installation (Google Chrome / Edge)

1. Open **Google Chrome** on your Android device.
2. Navigate to the application URL.
3. A prompt reading **"Install Delgone App"** will appear automatically, or:
4. Tap the three dots menu icon (`⋮`) in the top-right corner.
5. Select **"Install app"** or **"Add to Home screen"**.
6. Tap **Install** in the confirmation dialog.
7. The app is installed into your app drawer and home screen.

---

## 4. Desktop Installation (Windows / macOS / Linux)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Visit the application URL.
3. In the right side of the address bar, click the **Install** icon (computer screen with a down arrow).
4. Or click the yellow **"Install App"** button in the Delgone top navigation header.
5. Click **Install**.
6. Delgone Ledger will open as an independent desktop window and can be pinned to the Windows Taskbar or macOS Dock.

---

## 5. Offline Behavior & Financial Audit Notice

- **App Shell Caching:** Core UI views, styles, icons, and fonts remain cached for instant launch.
- **Connection Indicator:** A real-time status badge in the header displays **"Online • DB Ready"** (Green) or **"Device Offline"** (Red).
- **Audit Integrity Rule:** Delgone does not allow unverified offline sales recording. To guarantee serial sequence integrity (`DL-2026-XXXX`), prevent duplicate fiscal receipt numbers (`FS Number`), and ensure cash drawer reconciliation, an active network connection is required when creating transactions.
