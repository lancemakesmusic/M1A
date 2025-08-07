Thanks for confirming! Let's create a clean `README.md` to launch your new V2 GitHub repository confidently.

---

## Suggested `README.md` for V2

````markdown
# M1A - Version 2 (Clean App Rebuild)

This is the V2 version of the **M1A** app — a platform for Merkaba Entertainment fans, artists, and professionals to book services, schedule events, and engage socially with a familiar, bottom-tab interface.

---

##  Features (Current / Coming Soon)

-  **Authentication**
  - Email/password login & sign-up with **Firebase Auth**
  - Persistent login across sessions via **AsyncStorage**

-  **Navigation**
  - Bottom tab layout: Home, Explore, Messages, Wallet, Profile
  - Clean stack navigation with conditional routing based on auth state

-  **Explore**
  - Live-search mock list of artists/services (placeholder for Firestore integration)

-  **Messaging**
  - Real-time chat (Firestore-based) with user identity and simple chat UI

-  **Profile**
  - Displays current user’s `email` and UID (placeholder for more profile features)

-  **Wallet**
  - Placeholder screen ready for payments and wallet logic (e.g., Stripe)

---

##  Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lancemakesmusic/M1A.git
   cd M1A
````

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Set up Firebase:**

   * Copy your Firebase config values into `firebase.js`.
   * Alternatively, update placeholders like `apiKey`, `appId`, etc.

4. **Run the app:**

   ```bash
   npx expo start -c
   ```

---

## Next Steps & Roadmap

* Add Firestore-powered dynamic data:

  * Explore services
  * Chat messages and media
  * Booking and event feeds

* Integrate Stripe for payments and wallet functionality

* Add user profile editing, avatars, and social connections

* Polish UI with theming, icons, and responsive layouts

* Set up testing, CI/CD, and EAS build profiles

---

## Development Notes

* Ensure **Node.js v20+** for full Firebase compatibility
* Don't commit API/config secrets; keep in `.gitignore`
* Use `npx expo start -c` whenever debugging or making major changes
* For fast iteration, login persists across reloads via AsyncStorage

---

## License

[MIT License](LICENSE)

---

## Acknowledgements

Built for Merkaba Entertainment’s platform, inspired by the modern social model — tailored for artists, fans, and professionals.
