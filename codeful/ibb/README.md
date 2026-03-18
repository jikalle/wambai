# 🧵 Arewa Drape
**Northern Nigeria's Premium Fabric Marketplace**

Built with Expo (React Native) — runs on Android & iOS from one codebase.

---

## Project Structure

```
arewa-drape/
├── App.js                          # Root — navigation shell
├── app.json                        # Expo config
├── babel.config.js
├── package.json
└── src/
    ├── theme/
    │   └── index.js                # Colors, Typography, Spacing, Shadows
    ├── data/
    │   └── index.js                # Products, Categories, Orders, User (mock)
    ├── context/
    │   └── CartContext.js          # Global cart state (React Context)
    ├── components/
    │   └── index.js                # FabricSwatch, ProductCard, Button, QtySelector...
    └── screens/
        ├── HomeScreen.js           # Hero banner, categories, product rows, countdown
        ├── BrowseScreen.js         # Search, filter, sort, grid/list toggle
        ├── ProductDetailScreen.js  # Swatch, pricing, qty, add to cart, reviews
        ├── CartScreen.js           # Cart items, coupon, delivery, checkout, success
        ├── AuthScreen.js           # Login, Register, Forgot Password
        └── ProfileScreen.js        # Orders, Saved items, Settings
```

---

## Screens

| Screen | Description |
|--------|-------------|
| **Auth** | Login / Register / Forgot password with fabric swatch header |
| **Home** | Auto-sliding hero, category scroll, flash sale countdown, product rows |
| **Browse** | Search + filter by fabric type + sort + grid/list toggle |
| **Product Detail** | Fabric swatch, pricing, qty selector, add to cart, reviews tab |
| **Cart / Checkout** | Cart items, coupon (AREWA10), delivery options, order placement |
| **Profile** | Order history, saved fabrics, settings, sign out |

---

## Setup

### 1. Install Expo CLI
```bash
npm install -g expo-cli
```

### 2. Install dependencies
```bash
cd arewa-drape
npm install
```

### 3. Start the app
```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to preview on your phone instantly.

### 4. Run on emulator
```bash
npx expo start --android   # Android emulator
npx expo start --ios       # iOS simulator (Mac only)
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | Core Expo SDK |
| `expo-linear-gradient` | Gradient backgrounds (hero, banners) |
| `@react-navigation/native` | Navigation container |
| `@react-navigation/bottom-tabs` | Bottom tab bar |
| `@react-navigation/stack` | Stack navigation |
| `react-native-safe-area-context` | Safe area handling |
| `@expo/vector-icons` | Ionicons throughout |

---

## Swapping Mock Data for Real Backend

All mock data lives in `src/data/index.js`. To connect a real backend:

1. **Products/Categories** → Replace `PRODUCTS` and `CATEGORIES` arrays with API calls (Supabase, Firebase, or your own REST API)
2. **Auth** → Replace the `setTimeout` stubs in `AuthScreen.js` with real auth (Supabase Auth, Firebase Auth, or JWT)
3. **Orders** → Connect `CartScreen.js` checkout to Paystack API for payment, then write order to DB
4. **Cart** → `CartContext.js` is ready — just persist to AsyncStorage or backend on change

---

## Recommended Backend Stack

| Service | Use |
|---------|-----|
| **Supabase** | Database (PostgreSQL), Auth, Storage for fabric images |
| **Paystack** | Nigerian payments — card, bank transfer, USSD |
| **Cloudinary** | Fabric image storage and optimization |
| **Expo EAS** | Build APK/IPA and submit to Play Store / App Store |

---

## Publishing to Stores

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for Android (APK/AAB)
eas build --platform android

# Build for iOS (IPA)
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## Test Coupon
Use **AREWA10** at checkout for 10% off (demo only).

---

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6B1F1F` | Kola-red — buttons, accents |
| `gold` | `#C9922A` | Turmeric gold — highlights |
| `cream` | `#FAF3E8` | Warm backgrounds |
| `dark` | `#1C0F08` | Footer, dark surfaces |
| `text` | `#2A1A0E` | Body text |

---

Built for launch. Good luck! 🧵
