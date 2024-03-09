const { app, ipcMain } = require('electron/main');
const os = require('os');
const Store = require('electron-store');

const store = new Store();

let remainingPlayTime = 0;

function setRemainingPlayTime(newRemainingPlayTime) {
    remainingPlayTime = newRemainingPlayTime;
}

function getRemainingPlayTime() {
    return remainingPlayTime;
}

function setTvSeriesList(list) {
    store.set('tvSeriesList', list);
}

function getTvSeriesList() {
    return store.get('tvSeriesList', []);
}

function setVlcPath(vlcPath) {
    store.set('vlcPath', vlcPath);
}

function getVlcPath() {
    return store.get('vlcPath', ({
        'Linux': '/usr/bin/vlc',
        'Darwin': '/Applications/VLC.app/Contents/MacOS/VLC',
        'Windows_NT': 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    })[os.type()] ?? null);
}

function setVlcConfig(vlcConfig) {
    store.set('vlcConfig', vlcConfig);
}

function getVlcConfig() {
    const defaultConfig = {
        host: '127.0.0.1',
        port: 8080,
        password: 'vlcremote',
        extraintf: 'http,luaintf',
        options: [],
    };
    const storedConfig = store.get('vlcConfig', {});
    return {
        ...defaultConfig,
        ...storedConfig,
    }
}

app.whenReady().then(() => {
    ipcMain.handle('backend/api/store/getRemainingPlayTime', getRemainingPlayTime);
    ipcMain.handle('backend/api/store/setTvSeriesList', async (event, tvSeriesList) => setTvSeriesList(tvSeriesList));
    ipcMain.handle('backend/api/store/getTvSeriesList', getTvSeriesList);
    ipcMain.handle('backend/api/store/setVlcConfig', async (event, vlcConfig) => setVlcConfig(vlcConfig));
    ipcMain.handle('backend/api/store/getVlcConfig', getVlcConfig);
    ipcMain.handle('backend/api/store/setVlcPath', async (event, vlcConfig) => setVlcPath(vlcConfig));
    ipcMain.handle('backend/api/store/getVlcPath', getVlcPath);
});

module.exports = {
    setRemainingPlayTime,
    getRemainingPlayTime,
    setTvSeriesList,
    getTvSeriesList,
    getVlcConfig,
    setVlcPath,
    getVlcPath,
};
