# LokBookmarks

**LokBookmarks** is a highly aesthetic, high-performance, and fully customizable start page (New Tab) browser extension designed for Mozilla Firefox (built with Manifest V3). It replaces the default start page with an elegant, responsive dashboard organizing your local bookmarks.

## ✨ Core Features

1. **Local Bookmark Integration**:
   - Loads your native Firefox bookmarks instantly and securely without external services.
   - Organizes them into logical category cards (folders) with toggleable sections to keep the workspace clean.

2. **Adaptive Masonry & Responsive Grid**:
   - Uses an advanced CSS Grid and JavaScript-based adaptive folder masonry layout.
   - Automatically distributes bookmarks across self-adjusting columns with full responsive support.
   - Adapts container proportions with dynamic icon scaling as workspace sections expand or contract.

3. **Multi-Tier Robust Icon Fallback**:
   - Implements a dynamic programmatic favicon and SVG loader with high-performance fallbacks.
   - Direct resolution of Google domains/subdomains to high-res `gstatic` SVGs.
   - Multi-tier fallback chain: format-ordered direct site requests -> Google FaviconV2 -> high-quality generated vector avatar with a custom initials/gradient based on the site domain.

4. **Interactive Dashboard & Widgets**:
   - High-definition live digital clock and greeting adapted to the time of day.
   - Interactive, inline editable user greeting (click to change and persist name instantly).
   - Omnibar for instant incremental searching/filtering across all categories. Allows direct URL navigation and searching via customizable search engines (Google, Yandex, DuckDuckGo, Bing).

5. **Glassmorphic UI & Styling**:
   - Exquisite frosted-glass design (glassmorphic UI) with smooth transitions and customizable backdrop blur.
   - Curated color themes (such as Tokyo Night Moon theme accents, Sunset Nebula, Emerald, Forest, etc.) and custom image wallpaper support.
   - Automatic light/dark mode syncing with system preferences, alongside manual toggles.
   - Column configuration and layout density control (compact vs roomy modes).

## 🛡️ Privacy & Security

* **100% Client-Side**: All bookmark loading, query filtering, and preference adjustments are processed locally using Firefox's secure `browser.bookmarks` and `browser.storage.local` APIs.
* **No Tracking**: No external analytics, trackers, or telemetry are used.
