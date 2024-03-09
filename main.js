const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path')
const { emitter } = require('./backend/main');

global.commandLineArguments = process.argv.filter(
    arg => arg.startsWith('--')
).reduce((accumulator, currentValue) => {
    const valueSplit = currentValue.split('=');
    accumulator[valueSplit[0].replace(/^--/, '')] = valueSplit[1] ?? true;
    return accumulator;
}, {});

const createWindow = () => {
    global.mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    global.mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    if (global.commandLineArguments.minimize) {
        global.mainWindow.minimize();
    }
    if (global.commandLineArguments.autoplay) {
        emitter.emit('backend/api/playlist/autoplay');
    }
});
