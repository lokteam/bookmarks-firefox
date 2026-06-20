/* ==========================================================================
   LOKBOOKMARKS LAUNCHER - CORE LOGIC (newtab.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------------
  // 1. CONSTANTS & THEME LIST
  // ------------------------------------------------------------------------
  
  const DEFAULTS = {
    theme: 'dark',          // 'dark' or 'light'
    customTheme: 'minimal',  // 'minimal', 'catppuccin', 'onedark', 'tokyonight', 'nord', 'gruvbox', 'dracula', 'cyberpunk'
    glowEffect: true,
    folderColumns: 4,
    bgCustomUrl: '',
    bgOpacity: 75,
    bgBlur: 0
  };

  let settings = { ...DEFAULTS };
  let bookmarkTreeRoot = null; // Compiled clean recursive folder tree
  let localWallpaperBase64 = ''; // Base64 stored uploaded background image

  // ------------------------------------------------------------------------
  // 2. DOM ELEMENTS
  // ------------------------------------------------------------------------
  
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  
  const bookmarksWorkspace = document.getElementById('bookmarks-workspace');
  const emptyState = document.getElementById('empty-state');
  const bookmarksCountBadge = document.getElementById('bookmarks-count-badge');
  
  const settingsSidebar = document.getElementById('settings-sidebar');
  const settingsOpenBtn = document.getElementById('settings-open-btn');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');
  
  const themeSegmentBtns = document.querySelectorAll('[data-theme]');
  const customThemeSelect = document.getElementById('custom-theme-select');
  const folderColumnsSelect = document.getElementById('folder-columns-select');
  const glowEffectToggle = document.getElementById('glow-effect-toggle');
  
  const customBgInput = document.getElementById('custom-bg-input');
  const localBgTriggerBtn = document.getElementById('local-bg-trigger-btn');
  const localBgInput = document.getElementById('local-bg-input');
  const localBgFilename = document.getElementById('local-bg-filename');
  const clearBgBtn = document.getElementById('clear-bg-btn');

  const bgOpacityInput = document.getElementById('bg-opacity-input');
  const bgOpacityVal = document.getElementById('bg-opacity-val');
  const bgBlurInput = document.getElementById('bg-blur-input');
  const bgBlurVal = document.getElementById('bg-blur-val');
  const bgOpacitySettings = document.getElementById('bg-opacity-settings');
  const bgBlurSettings = document.getElementById('bg-blur-settings');

  // Sidebar dim overlay
  const sidebarOverlay = document.querySelector('.settings-sidebar-open-overlay') || (() => {
    const o = document.createElement('div');
    o.className = 'settings-sidebar-open-overlay';
    document.body.appendChild(o);
    return o;
  })();

  // ------------------------------------------------------------------------
  // 3. INITIALIZATION & LIFECYCLE
  // ------------------------------------------------------------------------
  
  async function init() {
    try {
      // 1. Load basic launcher settings
      const stored = await browser.storage.local.get('launcherSettings');
      if (stored && stored.launcherSettings) {
        settings = { ...DEFAULTS, ...stored.launcherSettings };
      }

      // 2. Load uploaded local background if available
      const wpStored = await browser.storage.local.get('localWallpaperBase64');
      if (wpStored && wpStored.localWallpaperBase64) {
        localWallpaperBase64 = wpStored.localWallpaperBase64;
      }
    } catch (e) {
      console.warn('Could not read stored data, using defaults:', e);
    }

    applySettingsToUI();
    buildSettingsPanel();
    
    await loadBookmarks();
    setupEventListeners();
  }

  function applySettingsToUI() {
    // Apply theme classes to body (e.g. class="theme-dark theme-catppuccin")
    document.body.className = '';
    document.body.classList.add(`theme-${settings.theme}`);
    document.body.classList.add(`theme-${settings.customTheme || 'minimal'}`);

    // Neon Glow Blobs switch
    if (settings.glowEffect) {
      document.body.classList.remove('no-glow');
    } else {
      document.body.classList.add('no-glow');
    }

    // Dynamic Columns CSS variable
    document.documentElement.style.setProperty('--folder-columns', settings.folderColumns || 4);

    // Dynamic background opacity and blur CSS variables
    const bgOpacity = settings.bgOpacity !== undefined ? settings.bgOpacity : 75;
    const bgBlur = settings.bgBlur !== undefined ? settings.bgBlur : 0;
    document.documentElement.style.setProperty('--bg-overlay-opacity', bgOpacity / 100);
    document.documentElement.style.setProperty('--bg-blur', `${bgBlur}px`);

    // Apply Wallpaper (Local Base64 has priority, then URL text, then default space background)
    let wallpaperLayer = document.querySelector('.bg-wallpaper');
    if (!wallpaperLayer) {
      wallpaperLayer = document.createElement('div');
      wallpaperLayer.className = 'bg-wallpaper';
      document.body.prepend(wallpaperLayer);
    }

    if (localWallpaperBase64) {
      wallpaperLayer.style.backgroundImage = `url("${localWallpaperBase64}")`;
      document.body.classList.add('has-wallpaper');
    } else if (settings.bgCustomUrl) {
      wallpaperLayer.style.backgroundImage = `url("${settings.bgCustomUrl}")`;
      document.body.classList.add('has-wallpaper');
    } else {
      wallpaperLayer.style.backgroundImage = 'none';
      document.body.classList.remove('has-wallpaper');
    }
  }

  async function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    try {
      await browser.storage.local.set({ launcherSettings: settings });
    } catch (e) {
      console.error('Error saving launcher settings:', e);
    }
    applySettingsToUI();
  }

  function buildSettingsPanel() {
    // Dark/Light segments state
    themeSegmentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === settings.theme);
    });

    customThemeSelect.value = settings.customTheme || 'minimal';
    folderColumnsSelect.value = settings.folderColumns || 4;
    glowEffectToggle.checked = settings.glowEffect;
    customBgInput.value = settings.bgCustomUrl || '';

    // Show / hide background opacity & blur settings based on wallpaper presence
    const hasWallpaper = !!(localWallpaperBase64 || settings.bgCustomUrl);
    if (hasWallpaper) {
      bgOpacitySettings.style.display = 'block';
      bgBlurSettings.style.display = 'block';
    } else {
      bgOpacitySettings.style.display = 'none';
      bgBlurSettings.style.display = 'none';
    }

    const currentOpacity = settings.bgOpacity !== undefined ? settings.bgOpacity : 75;
    const currentBlur = settings.bgBlur !== undefined ? settings.bgBlur : 0;

    bgOpacityInput.value = currentOpacity;
    bgOpacityVal.textContent = `${currentOpacity}%`;

    bgBlurInput.value = currentBlur;
    bgBlurVal.textContent = `${currentBlur}px`;

    // File upload label update
    if (localWallpaperBase64) {
      localBgFilename.textContent = 'Изображение загружено';
    } else {
      localBgFilename.textContent = 'Файл не выбран';
    }
  }

  // ------------------------------------------------------------------------
  // 4. BOOKMARKS RECURSIVE HIERARCHY TREE
  // ------------------------------------------------------------------------
  
  async function loadBookmarks() {
    bookmarksCountBadge.textContent = 'Чтение закладок...';
    try {
      if (typeof browser === 'undefined' || !browser.bookmarks) {
        throw new Error('Bookmarks API недоступно');
      }

      const tree = await browser.bookmarks.getTree();
      console.log('Original Bookmarks Tree from Firefox:', tree);

      // Find the Bookmarks Menu specifically
      const menuNode = findBookmarksMenuNode(tree[0]);
      
      if (menuNode) {
        console.log('Targeting Bookmarks Menu branch:', menuNode);
        bookmarkTreeRoot = buildCleanTree(menuNode);
      } else {
        console.warn('Bookmarks Menu folder not found. Compiling full tree.');
        bookmarkTreeRoot = buildCleanTree(tree[0]);
      }

      // Count total links in compiled tree
      const totalLinks = countLinksInTree(bookmarkTreeRoot);
      bookmarksCountBadge.textContent = `Приложений: ${totalLinks}`;
      
      renderBookmarksTree();

    } catch (e) {
      console.error('Error compiling bookmarks hierarchy:', e);
      bookmarksCountBadge.textContent = 'Демо-режим';
      
      // Fallback design mockups for design review
      bookmarkTreeRoot = getDesignMockups();
      renderBookmarksTree();
    }
  }

  // Find "menu________" or match translated folder titles
  function findBookmarksMenuNode(node) {
    if (!node) return null;
    if (node.id === 'menu________') return node;
    
    const title = (node.title || '').toLowerCase();
    if (title === 'меню закладок' || title === 'bookmarks menu' || title === 'bookmarksmenu') {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = findBookmarksMenuNode(child);
        if (found) return found;
      }
    }
    return null;
  }

  // Recursive tree compiler
  function buildCleanTree(node) {
    if (!node) return null;

    if (node.url) {
      // It's a bookmark
      return {
        id: node.id,
        type: 'bookmark',
        title: node.title || getDomainName(node.url) || 'Приложение',
        url: node.url,
        domain: getDomainName(node.url)
      };
    }

    // It's a folder
    if (node.children) {
      const childrenCompiled = [];
      let hasBookmarksRecursively = false;

      for (const child of node.children) {
        const compiled = buildCleanTree(child);
        if (compiled) {
          childrenCompiled.push(compiled);
          if (compiled.type === 'bookmark' || compiled.hasBookmarks) {
            hasBookmarksRecursively = true;
          }
        }
      }

      // Keep folder ONLY if it contains valid bookmark nodes somewhere
      if (childrenCompiled.length > 0) {
        let folderTitle = node.title || '';
        if (node.id === 'menu________' || node.id === 'root________') {
          folderTitle = 'Главная';
        }
        return {
          id: node.id,
          type: 'folder',
          title: folderTitle || 'Папка',
          children: childrenCompiled,
          hasBookmarks: hasBookmarksRecursively
        };
      }
    }

    return null;
  }

  function getDomainName(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./i, '');
    } catch (e) {
      return '';
    }
  }

  function countLinksInTree(treeNode) {
    if (!treeNode) return 0;
    if (treeNode.type === 'bookmark') return 1;
    
    let count = 0;
    if (treeNode.children) {
      treeNode.children.forEach(child => {
        count += countLinksInTree(child);
      });
    }
    return count;
  }

  // ------------------------------------------------------------------------
  // 5. RENDER RECURSIVE FOLDER CARDS
  // ------------------------------------------------------------------------
  
  function renderBookmarksTree() {
    bookmarksWorkspace.replaceChildren();

    if (!bookmarkTreeRoot || !bookmarkTreeRoot.children) {
      showEmptyState();
      return;
    }

    // Separate direct bookmarks and top-level subfolders under the Bookmarks Menu
    const rootBookmarks = [];
    const topLevelFolders = [];

    bookmarkTreeRoot.children.forEach(child => {
      if (child.type === 'bookmark') {
        rootBookmarks.push(child);
      } else if (child.type === 'folder' && child.hasBookmarks) {
        topLevelFolders.push(child);
      }
    });

    // 1. If direct bookmarks exist in the Bookmarks Menu, group them in a 'Главная' card
    if (rootBookmarks.length > 0) {
      const rootFolderCard = createFolderCardDOM({
        id: 'root-bookmarks-folder',
        title: 'Главная',
        children: rootBookmarks
      }, false);
      bookmarksWorkspace.appendChild(rootFolderCard);
    }

    // 2. Render all other top-level folders
    topLevelFolders.forEach(folder => {
      const folderCard = createFolderCardDOM(folder, false);
      bookmarksWorkspace.appendChild(folderCard);
    });

    if (bookmarksWorkspace.children.length === 0) {
      showEmptyState();
    } else {
      emptyState.style.display = 'none';
      bookmarksWorkspace.style.display = 'flex';
    }
  }

  // Recursive folder DOM generator
  function createFolderCardDOM(folderNode, isNested = false) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    if (isNested) {
      card.classList.add('nested-folder');
    }
    card.setAttribute('data-folder-id', folderNode.id);

    // Header (Title with clean Folder SVG icon)
    const header = document.createElement('h3');
    header.className = 'folder-header';

    const svgFolder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFolder.setAttribute('viewBox', '0 0 24 24');
    svgFolder.setAttribute('width', '16');
    svgFolder.setAttribute('height', '16');
    svgFolder.setAttribute('stroke', 'currentColor');
    svgFolder.setAttribute('stroke-width', '2.5');
    svgFolder.setAttribute('fill', 'none');
    svgFolder.setAttribute('stroke-linecap', 'round');
    svgFolder.setAttribute('stroke-linejoin', 'round');

    const pathFolder = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathFolder.setAttribute('d', 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z');
    svgFolder.appendChild(pathFolder);

    header.replaceChildren(svgFolder, document.createTextNode(folderNode.title));
    card.appendChild(header);

    // Folder content area
    const content = document.createElement('div');
    content.className = 'folder-content';

    const bookmarks = [];
    const subfolders = [];

    (folderNode.children || []).forEach(child => {
      if (child.type === 'bookmark') {
        bookmarks.push(child);
      } else if (child.type === 'folder' && child.hasBookmarks) {
        subfolders.push(child);
      }
    });

    // A. Add Direct Bookmarks grid
    if (bookmarks.length > 0) {
      const appsGrid = document.createElement('div');
      appsGrid.className = 'apps-grid';

      bookmarks.forEach(bookmark => {
        const appTile = createAppTileDOM(bookmark);
        appsGrid.appendChild(appTile);
      });
      content.appendChild(appsGrid);
    }

    // B. Recursively append Nested Subfolders
    if (subfolders.length > 0) {
      subfolders.forEach(sub => {
        const subCard = createFolderCardDOM(sub, true);
        content.appendChild(subCard);
      });
    }

    card.appendChild(content);
    return card;
  }

  // Create iOS/Android Launchpad app shortcut tile
  function createAppTileDOM(bookmark) {
    const tile = document.createElement('a');
    tile.className = 'app-tile';
    tile.href = bookmark.url;
    
    // Store metadata attributes on DOM for fast instant searches
    tile.setAttribute('data-title', bookmark.title);
    tile.setAttribute('data-url', bookmark.url);

    // Squircle Icon Container
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'app-icon-wrapper';

    // Google high-resolution favicon cache
    const favUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(bookmark.url)}&sz=64`;
    const img = document.createElement('img');
    img.src = favUrl;
    img.alt = '';
    
    // Fallback in case of network block or offline state
    img.onerror = () => {
      const fallback = document.createElement('div');
      fallback.className = 'app-fallback-icon';
      fallback.style.background = getGradientForString(bookmark.domain || bookmark.title || 'app');
      fallback.textContent = (bookmark.title || bookmark.domain || 'A').trim().charAt(0).toUpperCase();
      img.replaceWith(fallback);
    };

    iconWrapper.appendChild(img);

    // App title
    const titleEl = document.createElement('div');
    titleEl.className = 'app-title';
    titleEl.textContent = bookmark.title;

    tile.replaceChildren(iconWrapper, titleEl);
    return tile;
  }

  // Generates unique linear gradient from domain name hash
  function getGradientForString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 75%, 52%) 0%, hsl(${h2}, 80%, 42%) 100%)`;
  }

  function showEmptyState() {
    bookmarksWorkspace.style.display = 'none';
    emptyState.style.display = 'flex';
  }

  // ------------------------------------------------------------------------
  // 6. INSTANT CLIENT-SIDE DOM SEARCH
  // ------------------------------------------------------------------------
  
  function performLocalSearch() {
    const query = searchInput.value.toLowerCase().trim();
    searchClearBtn.style.display = query ? 'flex' : 'none';

    if (!query) {
      // Re-enable all folders and shortcuts
      document.querySelectorAll('.folder-card').forEach(el => el.style.display = 'flex');
      document.querySelectorAll('.app-tile').forEach(el => el.style.display = 'flex');
      emptyState.style.display = 'none';
      bookmarksWorkspace.style.display = 'flex';
      return;
    }

    let totalMatches = 0;

    // A. Filter all app tiles across the DOM
    const appTiles = document.querySelectorAll('.app-tile');
    appTiles.forEach(tile => {
      const title = (tile.getAttribute('data-title') || '').toLowerCase();
      const url = (tile.getAttribute('data-url') || '').toLowerCase();
      
      if (title.includes(query) || url.includes(query)) {
        tile.style.display = 'flex';
        totalMatches++;
      } else {
        tile.style.display = 'none';
      }
    });

    // B. Recursively evaluate Folder Cards bottom-up (innermost subfolders first)
    const folderCards = Array.from(document.querySelectorAll('.folder-card'));
    
    // Sort folder cards so nested folders are evaluated first
    folderCards.sort((a, b) => {
      const depthA = a.querySelectorAll('.folder-card').length;
      const depthB = b.querySelectorAll('.folder-card').length;
      return depthA - depthB;
    });

    folderCards.forEach(card => {
      // Check if this folder contains any visible app-tiles directly inside its immediate grid
      const hasVisibleDirectApps = Array.from(card.querySelectorAll(':scope > .folder-content > .apps-grid > .app-tile'))
        .some(tile => tile.style.display !== 'none');

      // Check if this folder contains any visible sub-folder cards inside
      const hasVisibleSubfolders = Array.from(card.querySelectorAll(':scope > .folder-content > .folder-card'))
        .some(sub => sub.style.display !== 'none');

      if (hasVisibleDirectApps || hasVisibleSubfolders) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    // Toggle Empty state view
    if (totalMatches === 0) {
      bookmarksWorkspace.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      bookmarksWorkspace.style.display = 'flex';
      emptyState.style.display = 'none';
    }
  }

  // ------------------------------------------------------------------------
  // 7. INTERACTIVE EVENTS & SIDEBAR
  // ------------------------------------------------------------------------
  
  function setupEventListeners() {
    // Settings toggles
    function openSidebar() {
      settingsSidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
      buildSettingsPanel();
    }

    function closeSidebar() {
      settingsSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    }

    settingsOpenBtn.addEventListener('click', openSidebar);
    settingsCloseBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Esc bindings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        if (searchInput.value) {
          searchInput.value = '';
          searchClearBtn.style.display = 'none';
          performLocalSearch();
        }
      }
    });

    // Settings adjustments listeners
    themeSegmentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        themeSegmentBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveSettings({ theme: btn.getAttribute('data-theme') });
      });
    });

    customThemeSelect.addEventListener('change', (e) => {
      saveSettings({ customTheme: e.target.value });
    });

    folderColumnsSelect.addEventListener('change', (e) => {
      saveSettings({ folderColumns: parseInt(e.target.value, 10) });
    });

    glowEffectToggle.addEventListener('change', (e) => {
      saveSettings({ glowEffect: e.target.checked });
    });

    // Web link wallpaper
    customBgInput.addEventListener('change', async (e) => {
      const url = e.target.value.trim();
      // If a web URL is written, clear local image wallpaper to avoid overlap
      localWallpaperBase64 = '';
      localBgFilename.textContent = 'Файл не выбран';
      await browser.storage.local.remove('localWallpaperBase64');
      await saveSettings({ bgCustomUrl: url });
      buildSettingsPanel();
    });

    // Local file wallpaper trigger
    localBgTriggerBtn.addEventListener('click', () => {
      localBgInput.click();
    });

    // Local file wallpaper selected
    localBgInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      localBgFilename.textContent = 'Загрузка...';

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        try {
          localWallpaperBase64 = base64;
          await browser.storage.local.set({ localWallpaperBase64: base64 });
          
          // Clear web URL to avoid conflict
          customBgInput.value = '';
          localBgFilename.textContent = file.name;
          await saveSettings({ bgCustomUrl: '' });
          buildSettingsPanel();
        } catch (err) {
          console.error('Failed to save uploaded image:', err);
          alert('Ошибка при сохранении файла. Пожалуйста, попробуйте картинку меньшего размера (рекомендуется сжатый JPG/PNG).');
          localBgFilename.textContent = 'Ошибка загрузки';
        }
      };
      reader.readAsDataURL(file);
    });

    // Opacity slider live updates
    bgOpacityInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      bgOpacityVal.textContent = `${val}%`;
      document.documentElement.style.setProperty('--bg-overlay-opacity', val / 100);
    });

    bgOpacityInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      saveSettings({ bgOpacity: val });
    });

    // Blur slider live updates
    bgBlurInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      bgBlurVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--bg-blur', `${val}px`);
    });

    bgBlurInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      saveSettings({ bgBlur: val });
    });

    // Delete wallpapers completely
    clearBgBtn.addEventListener('click', async () => {
      localWallpaperBase64 = '';
      localBgFilename.textContent = 'Файл не выбран';
      localBgInput.value = '';
      customBgInput.value = '';
      await browser.storage.local.remove('localWallpaperBase64');
      await saveSettings({ bgCustomUrl: '' });
      buildSettingsPanel();
    });

    // Reset settings button
    resetSettingsBtn.addEventListener('click', async () => {
      if (confirm('Сбросить параметры лончера к стандартным?')) {
        localWallpaperBase64 = '';
        localBgFilename.textContent = 'Файл не выбран';
        localBgInput.value = '';
        await browser.storage.local.remove('localWallpaperBase64');
        await saveSettings(DEFAULTS);
        buildSettingsPanel();
        closeSidebar();
      }
    });

    // Live search bindings
    searchInput.addEventListener('input', performLocalSearch);

    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      performLocalSearch();
      searchInput.focus();
    });
  }

  // ------------------------------------------------------------------------
  // 8. DESIGN MOCKUPS TREE (Preserving Folder Nesting Example)
  // ------------------------------------------------------------------------
  
  function getDesignMockups() {
    return {
      id: 'mock-root',
      type: 'folder',
      title: 'Главная',
      hasBookmarks: true,
      children: [
        {
          id: 'mock-1',
          type: 'folder',
          title: 'Соцсети и стримы',
          hasBookmarks: true,
          children: [
            { type: 'bookmark', title: 'YouTube', url: 'https://youtube.com', domain: 'youtube.com' },
            { type: 'bookmark', title: 'Twitch', url: 'https://twitch.tv', domain: 'twitch.tv' },
            { type: 'bookmark', title: 'VKontakte', url: 'https://vk.com', domain: 'vk.com' },
            { type: 'bookmark', title: 'Telegram Web', url: 'https://web.telegram.org', domain: 'telegram.org' }
          ]
        },
        {
          id: 'mock-2',
          type: 'folder',
          title: 'Разработка',
          hasBookmarks: true,
          children: [
            { type: 'bookmark', title: 'GitHub', url: 'https://github.com', domain: 'github.com' },
            { type: 'bookmark', title: 'Stack Overflow', url: 'https://stackoverflow.com', domain: 'stackoverflow.com' },
            { type: 'bookmark', title: 'ChatGPT AI', url: 'https://chat.openai.com', domain: 'openai.com' },
            {
              id: 'mock-2-nested',
              type: 'folder',
              title: 'Справочники и доки',
              hasBookmarks: true,
              children: [
                { type: 'bookmark', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', domain: 'developer.mozilla.org' },
                { type: 'bookmark', title: 'Figma Design', url: 'https://figma.com', domain: 'figma.com' },
                { type: 'bookmark', title: 'NPM Registry', url: 'https://npmjs.com', domain: 'npmjs.com' }
              ]
            }
          ]
        },
        {
          id: 'mock-3',
          type: 'folder',
          title: 'Медиа',
          hasBookmarks: true,
          children: [
            { type: 'bookmark', title: 'Кинопоиск', url: 'https://kinopoisk.ru', domain: 'kinopoisk.ru' },
            { type: 'bookmark', title: 'Netflix', url: 'https://netflix.com', domain: 'netflix.com' }
          ]
        }
      ]
    };
  }

  // Run initializer
  init();
});
