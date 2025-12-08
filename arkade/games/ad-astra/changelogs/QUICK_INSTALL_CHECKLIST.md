# Ad Astra - Quick Installation Checklist

## ✅ **ESSENTIAL FILES - Install These**

### **Game Server** (6 files)

- [ ] **server.py** → `G:\Ad Astra\server.py`
- [ ] **requirements.txt** → `G:\Ad Astra\requirements.txt`
- [ ] **index.html** → `G:\Ad Astra\index.html` (REPLACE)
- [ ] **login-fix.css** → `G:\Ad Astra\css\login-fix.css`
- [ ] **favicon.svg** → `G:\Ad Astra\favicon.svg`
- [ ] Run: `pip install flask flask-cors --break-system-packages`

### **Sysop Station** (Optional but recommended)

- [ ] Extract **sysop-station.zip** to any folder
- [ ] Edit `main.js` line 13 with your game path
- [ ] Run: `npm install` in sysop-station folder
- [ ] Launch: `npm start` or double-click `launch-sysop.bat`

---

## 🚀 **Quick Start**

### **Option 1: With Sysop Station**
```bash
# Launch Sysop Station
cd "G:\sysop-station"
npm start

# Click "START SERVERS" button
# Click "COPY URL" to get tunnel link
# Share with friends!
```

### **Option 2: Manual**
```bash
# Start Flask server
cd "G:\Ad Astra"
python server.py

# Start tunnel (separate terminal)
lt --port 8000 --subdomain adastra

# Share URL: https://adastra.loca.lt
```

---

## 🧪 **Test Checklist**

After installing:

- [ ] Server starts without errors
- [ ] Browser loads http://localhost:8000
- [ ] Login screen centered with starfield
- [ ] No console errors (F12)
- [ ] Can create account
- [ ] Database file created: `adastra.db`
- [ ] Can login from different browser with same account
- [ ] Tunnel URL accessible (after entering password)

---

## ⚠️ **Common Issues**

**"Address already in use"**
```bash
netstat -ano | findstr :8000
taskkill /F /PID [number]
```

**"Module flask not found"**
```bash
pip install flask flask-cors --break-system-packages
```

**Tunnel asks for password**
- Password = your public IP
- Get from: https://whatismyipaddress.com/

---

## 📊 **What You Get**

✅ **Database-backed accounts** (work across devices)  
✅ **Professional monitoring dashboard** (Sysop Station)  
✅ **One-click server management**  
✅ **Clean, centered UI**  
✅ **Ready for multiplayer**

---

**See COMPLETE_SESSION_CHANGELOG.md for full details!**
