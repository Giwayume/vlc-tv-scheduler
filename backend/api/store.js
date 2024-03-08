const { app, ipcMain } = require('electron/main');
const Store = require('electron-store');

const store = new Store();

function setTvSeriesList(list) {
    store.set('tvSeriesList', list);
}

function getTvSeriesList() {
    return store.get('tvSeriesList', []);
}

function getVlcConfig() {
    return {
        host: '127.0.0.1',
        port: 8080,
        password: 'vlcremote',
        extraintf: 'http,luaintf',
        options: [],
    };
}

app.whenReady().then(() => {
    ipcMain.handle('backend/api/store/setTvSeriesList', async (event, tvSeriesList) => setTvSeriesList(tvSeriesList));
    ipcMain.handle('backend/api/store/getTvSeriesList', getTvSeriesList);
});

module.exports = {
    setTvSeriesList,
    getTvSeriesList,
    getVlcConfig,
};
