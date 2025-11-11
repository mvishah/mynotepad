# ⚡ QUICK START - Get App on Your Tablet NOW

## 🌐 **RECOMMENDED: Deploy for Offline Use** (10 Minutes)

### ⚠️ **Important: For Offline + Anywhere Access**
If you need to work **offline** or **away from your current network**, you MUST deploy the app!

The local network method only works when:
- ✅ Both devices on same WiFi
- ✅ Laptop is ON and running dev server
- ❌ **NO offline support**
- ❌ **NO PWA features**

---

## 🚀 Best Way - Deploy to Vercel (Works Offline!)

### Why Deploy?
- ✅ **Works OFFLINE** after first install
- ✅ **Works on any network** (WiFi, mobile data, airplane mode!)
- ✅ **Install as native app** on home screen
- ✅ No need to keep laptop on
- ✅ HTTPS secured
- ✅ Access from anywhere in the world

### Steps to Deploy:

#### 1. Install Vercel CLI (One Time)
```bash
npm install -g vercel
```

#### 2. Build & Deploy
```bash
npm run build
vercel
```

- Login when prompted (use GitHub - easiest)
- Press Enter to accept defaults
- **Copy the URL** you get (e.g., `https://your-app.vercel.app`)  // https://vercel.link/git

#### 3. Install on Tablet & Use Offline

**On Android/Windows Tablet:**
1. Open the Vercel URL in Chrome/Edge
2. Tap "Install" banner or menu (⋮) → "Install app"
3. App appears on home screen
4. **Open the app and use it!**
5. ✨ **It will work OFFLINE automatically!**

**On iPad:**
1. Open the Vercel URL in Safari
2. Tap Share (⬆️) → "Add to Home Screen"
3. Open from home screen
4. ✨ **Works offline after first load!**

---

## 📶 Offline Features After Installation

Once installed as PWA:
- ✅ **Full app functionality offline**
- ✅ **Create & edit sketches offline**
- ✅ **Open & annotate PDFs offline** (if loaded before)
- ✅ **All changes saved to device**
- ✅ **Works on airplane mode**
- ✅ **No internet required** after installation

---

## 🔄 When You Make Changes

### After Deploying to Vercel:
```bash
npm run build
vercel --prod
```

The tablet app will **auto-update** next time you open it when online!

---

## 🧪 Quick Test for Offline (Optional)

Want to test local network first? (Won't work offline!)

```bash
npm run dev:network
```
- Find Network URL in terminal
- Open on tablet (same WiFi)
- **Remember:** Laptop must stay on, no offline support!

---

## ❓ Quick Troubleshooting

**Can't access local URL?**
- Check: Both on same WiFi?
- Check: Laptop firewall off?
- Try: Restart dev server

**Vercel not working?**
- Make sure you're in project folder
- Try: `vercel login` first
- Check: Internet connection

---

That's it! Choose your method and get started! 🚀

