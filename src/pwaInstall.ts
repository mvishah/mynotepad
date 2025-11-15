// PWA Install Prompt Handler

let deferredPrompt: any = null;

// Make deferredPrompt globally accessible
(window as any).deferredPrompt = deferredPrompt;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  (window as any).deferredPrompt = e; // Update global reference
  console.log('PWA install prompt available');

  // Show install button or banner
  showInstallBanner();
});

// Show install banner
export function showInstallBanner() {
  // Create install banner if it doesn't exist
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: slideUp 0.3s ease;
    max-width: 90%;
  `;

  // Check if we have a deferred prompt available
  const hasDeferredPrompt = !!deferredPrompt;
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);

  let buttonText = 'Install';
  let instructions = 'Add to your home screen for better experience';

  if (!hasDeferredPrompt) {
    if (isIOS && isSafari) {
      buttonText = 'iOS Instructions';
      instructions = 'Tap Share → Add to Home Screen';
    } else if (isAndroid && isChrome) {
      buttonText = 'Android Instructions';
      instructions = 'Look for install icon or use menu';
    } else if ((isChrome || isEdge) && !isAndroid) {
      buttonText = 'Desktop Instructions';
      instructions = 'Look for install icon in address bar';
    } else if (isFirefox) {
      buttonText = 'Firefox Options';
      instructions = 'Firefox has limited PWA support';
    } else {
      buttonText = 'Installation Help';
      instructions = 'See installation options for your browser';
    }
  }

  banner.innerHTML = `
    <style>
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    </style>
    <span style="font-size: 1.5rem;">📱</span>
    <div style="flex: 1;">
      <div style="font-weight: 600; font-size: 1rem;">Install App</div>
      <div style="font-size: 0.85rem; opacity: 0.9;">${instructions}</div>
    </div>
    <button id="pwa-install-btn" style="
      background: white;
      color: #667eea;
      border: none;
      padding: 0.6rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
    ">${buttonText}</button>
    <button id="pwa-dismiss-btn" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.5);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
    ">Not Now</button>
  `;

  document.body.appendChild(banner);

  // Handle install button click
  document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
    if (hasDeferredPrompt) {
      installPWA();
    } else {
      // Show detailed installation instructions
      showInstallInstructions();
      banner.remove();
    }
  });

  // Handle dismiss button click
  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    banner.remove();
  });
}

// Install PWA
async function installPWA() {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);

  // Clear the deferredPrompt
  deferredPrompt = null;
  (window as any).deferredPrompt = null; // Clear global reference

  // Remove the banner
  document.getElementById('pwa-install-banner')?.remove();
}

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully');
  deferredPrompt = null;
  (window as any).deferredPrompt = null; // Clear global reference
  document.getElementById('pwa-install-banner')?.remove();
});

// Check if app is running in standalone mode
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
}

// Show install instructions for iOS
export function showIOSInstallInstructions() {
  if (isIOSDevice() && !isStandalone()) {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #2c3e50;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 90%;
      text-align: center;
    `;
    
    instructions.innerHTML = `
      <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">Install on iOS</div>
      <div style="font-size: 0.9rem; margin-bottom: 1rem;">
        Tap <strong>Share</strong> <span style="font-size: 1.2rem;">⬆️</span> then <strong>Add to Home Screen</strong> 
        <span style="font-size: 1.2rem;">➕</span>
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      ">Got it!</button>
    `;
    
    document.body.appendChild(instructions);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      instructions.remove();
    }, 10000);
  }
}

// Show detailed installation instructions
export function showInstallInstructions() {
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    color: #2c3e50;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    max-width: 90%;
    text-align: center;
    max-height: 80vh;
    overflow-y: auto;
  `;

  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isSamsung = /SamsungBrowser/.test(userAgent);

  let title = "Installation Instructions";
  let content = "";
  let showManualBookmark = false;

  // iOS Safari
  if (isIOS && isSafari) {
    title = "Install on iOS Safari";
    content = `
      <div style="margin-bottom: 1rem;">
        <strong>Method 1: Add to Home Screen</strong><br>
        1. Tap the <strong>Share</strong> button <span style="font-size: 1.2rem;">⬆️</span><br>
        2. Scroll down and tap <strong>"Add to Home Screen"</strong> <span style="font-size: 1.2rem;">➕</span><br>
        3. Tap <strong>"Add"</strong> in the top right
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Method 2: Use Bookmark</strong><br>
        1. Tap the Share button <span style="font-size: 1.2rem;">⬆️</span><br>
        2. Tap <strong>"Add to Favorites"</strong><br>
        3. Open from Favorites for full-screen experience
      </div>
    `;
  }
  // Android Chrome
  else if (isAndroid && isChrome) {
    title = "Install on Android Chrome";
    content = `
      <div style="margin-bottom: 1rem;">
        <strong>Method 1: Install Button</strong><br>
        Look for the install icon <span style="font-size: 1.2rem;">📱</span> in the address bar<br>
        <em>(May appear after visiting the site multiple times)</em>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Method 2: Menu Option</strong><br>
        1. Tap the menu (⋮) in top right<br>
        2. Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
      </div>
    `;
  }
  // Desktop Chrome/Edge
  else if ((isChrome || isEdge) && !isAndroid) {
    title = "Install on Desktop Chrome/Edge";
    content = `
      <div style="margin-bottom: 1rem;">
        Look for the install icon <span style="font-size: 1.2rem;">📱</span> in the address bar<br>
        <em>(Click it to install as desktop app)</em>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Alternative:</strong><br>
        1. Click the menu (⋮) in top right<br>
        2. Select <strong>"Install [App Name]"</strong>
      </div>
    `;
  }
  // Firefox
  else if (isFirefox) {
    title = "Firefox Installation";
    content = `
      <div style="margin-bottom: 1rem;">
        Firefox has limited PWA support. Try these alternatives:
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Option 1: Desktop Shortcut</strong><br>
        1. Click the URL bar to highlight it<br>
        2. Drag the URL to your desktop<br>
        3. Double-click the shortcut to open in Firefox
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Option 2: Bookmark</strong><br>
        1. Press Ctrl+D (Cmd+D on Mac)<br>
        2. Save as bookmark in toolbar<br>
        3. Click bookmark for quick access
      </div>
    `;
    showManualBookmark = true;
  }
  // Samsung Internet
  else if (isSamsung) {
    title = "Install on Samsung Internet";
    content = `
      <div style="margin-bottom: 1rem;">
        <strong>Method 1:</strong><br>
        Look for <strong>"Install app"</strong> in the menu (⋮)
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Method 2:</strong><br>
        1. Tap menu (⋮) → <strong>"Add to Home screen"</strong><br>
        2. Tap <strong>"Install"</strong>
      </div>
    `;
  }
  // Other browsers
  else {
    title = "Installation Options";
    content = `
      <div style="margin-bottom: 1rem;">
        <strong>Your browser may not support PWA installation.</strong><br>
        Try these alternatives:
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Option 1: Bookmark</strong><br>
        Save this page as a bookmark for quick access
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Option 2: Desktop Shortcut</strong><br>
        Drag the URL from address bar to desktop
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Recommended: Try Chrome or Edge</strong><br>
        For full PWA features, use Chrome, Edge, or Safari
      </div>
    `;
    showManualBookmark = true;
  }

  instructions.innerHTML = `
    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 1rem; color: #667eea;">${title}</div>
    <div style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
      ${content}
    </div>
    <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.6rem 1.2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.9rem;
      ">Got it!</button>
      ${showManualBookmark ? `
        <button onclick="window.open('https://mynotepad-lac.vercel.app/', '_blank')" style="
          background: #f8f9fa;
          color: #2c3e50;
          border: 2px solid #dee2e6;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        ">Open in New Tab</button>
      ` : ''}
    </div>
  `;

  document.body.appendChild(instructions);

  // Auto-dismiss after 15 seconds for detailed instructions
  setTimeout(() => {
    if (instructions.parentElement) {
      instructions.remove();
    }
  }, 15000);
}

// Check if iOS device
function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Initialize PWA features
export function initPWA() {
  console.log('🚀 PWA features initializing...');
  console.log('📱 Is standalone:', isStandalone());
  console.log('⚙️ Service worker supported:', 'serviceWorker' in navigator);
  console.log('📲 Before install prompt supported:', 'onbeforeinstallprompt' in window);
  console.log('🌐 Protocol:', window.location.protocol);
  console.log('🏠 Hostname:', window.location.hostname);

  // Check if already installed
  if (isStandalone()) {
    console.log('✅ App is already installed (standalone mode)');
    return;
  }

  // Force show install banner for testing in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🧪 Development mode: forcing install banner in 3 seconds...');
    setTimeout(() => {
      showInstallBanner();
    }, 3000);
  } else {
    // In production, show install banner after a short delay if no beforeinstallprompt event
    console.log('📦 Production mode: waiting for beforeinstallprompt event or showing fallback...');

    // Show install banner immediately for better user experience
    setTimeout(() => {
      console.log('Showing install banner proactively');
      showInstallBanner();
    }, 1000);
  }

  // Show iOS instructions after a delay
  setTimeout(() => {
    showIOSInstallInstructions();
  }, 4000);
}

