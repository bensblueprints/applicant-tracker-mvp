// Desktop mode: boots the same Express server on a free local port,
// stores data in Electron's userData dir, and opens a window auto-logged-in as admin.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const crypto = require('crypto');

let win;

app.whenReady().then(() => {
  const dataDir = path.join(app.getPath('userData'), 'data');
  const autologinToken = crypto.randomBytes(24).toString('hex');

  const { createApp } = require(path.join(__dirname, '..', 'server', 'app.js'));
  const server = createApp({
    dbPath: path.join(dataDir, 'hirestack.db'),
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    companyName: process.env.COMPANY_NAME || 'Our company',
    autologinToken
  });

  const listener = server.listen(0, '127.0.0.1', () => {
    const port = listener.address().port;
    win = new BrowserWindow({
      width: 1380,
      height: 900,
      autoHideMenuBar: true,
      backgroundColor: '#09090b',
      title: 'Hirestack',
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    win.loadURL(`http://127.0.0.1:${port}/auth/auto?token=${autologinToken}`);
  });

  app.on('window-all-closed', () => {
    listener.close();
    app.quit();
  });
});
