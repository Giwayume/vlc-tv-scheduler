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

function setPlaylistConfig(playlistConfig) {
    store.set('playlistConfig', playlistConfig);
}

function getPlaylistConfig() {
    return store.get('playlistConfig', {
        randomizeTvList: false,
        randomizeTvSeriesStartOffset: false,
        enableTimebox: false,
        timeboxIntervalSeconds: 900,
    });
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

function setVlcPreferences(vlcPreferences) {
    store.set('vlcPreferences', vlcPreferences);
}

function getVlcPreferences() {
    return store.get('vlcPreferences', {
        autoScheduleRestarts: true,
        restartInterval: 86400,
        pauseSkipTime: 10,
    });
}

function setAcceptedFileExtensions(acceptedFileExtensions) {
    store.set('acceptedFileExtensions', acceptedFileExtensions);
}

function getAcceptedFileExtensions() {
    return store.get('acceptedFileExtensions', [
        '3gp', 'a52', 'aac', 'asf', 'au', 'avi', 'dts', 'dv',
        'flac', 'flv', 'mka', 'mkv', 'mov', 'mp2', 'mp3', 'mp4', 'mpg',
        'nsc', 'nsv', 'nut', 'ogg', 'ogm', 'ra', 'ram', 'rm', 'rmbv', 'rv',
        'tac', 'ts', 'tta', 'ty', 'vid', 'wav', 'wmv', 'xa',
    ]);
}

function normalizeStoreData() {
    const tvSeriesList = getTvSeriesList();
    for (const tvSeries of tvSeriesList) {
        if (tvSeries.folder == null) tvSeries.folder = 'UNDEFINED_FOLDER';
        if (tvSeries.title == null) tvSeries.title = '';
        if (tvSeries.playCount == null) tvSeries.playCount = 1;
        if (tvSeries.playOrder == null) tvSeries.playOrder = 'alphabetical';
        if (tvSeries.playlistOffset == null) tvSeries.playlistOffset = 0;
        if (tvSeries.playTimeType == null) tvSeries.playTimeType = 'videoLength';
        if (tvSeries.playTime == null) tvSeries.playTime = 0;
        if (tvSeries.cron == null) tvSeries.cron = '* * * * *';
    }
    setTvSeriesList(tvSeriesList);

    const playlistConfig = getPlaylistConfig();
    if (playlistConfig.randomizeTvList == null) playlistConfig.randomizeTvList = false;
    if (playlistConfig.randomizeTvSeriesStartOffset == null) playlistConfig.randomizeTvSeriesStartOffset = false;
    if (playlistConfig.enableTimebox == null) playlistConfig.enableTimebox = false;
    if (playlistConfig.timeboxIntervalSeconds == null) playlistConfig.timeboxIntervalSeconds = 900;
    setPlaylistConfig(playlistConfig);

    const vlcPreferences = getVlcPreferences();
    if (vlcPreferences.autoScheduleRestarts == null) vlcPreferences.autoScheduleRestarts = true;
    if (vlcPreferences.restartInterval == null) vlcPreferences.restartInterval = 86400;
    if (vlcPreferences.pauseSkipTime == null) vlcPreferences.pauseSkipTime = 10;
    setVlcPreferences(vlcPreferences);
}

app.whenReady().then(() => {
    normalizeStoreData();
    ipcMain.handle('backend/api/store/getRemainingPlayTime', getRemainingPlayTime);
    ipcMain.handle('backend/api/store/setTvSeriesList', async (event, tvSeriesList) => setTvSeriesList(tvSeriesList));
    ipcMain.handle('backend/api/store/getTvSeriesList', getTvSeriesList);
    ipcMain.handle('backend/api/store/setPlaylistConfig', async (event, playlistConfig) => setPlaylistConfig(playlistConfig));
    ipcMain.handle('backend/api/store/getPlaylistConfig', getPlaylistConfig);
    ipcMain.handle('backend/api/store/setVlcConfig', async (event, vlcConfig) => setVlcConfig(vlcConfig));
    ipcMain.handle('backend/api/store/getVlcConfig', getVlcConfig);
    ipcMain.handle('backend/api/store/setVlcPreferences', async (event, vlcPreferences) => setVlcPreferences(vlcPreferences));
    ipcMain.handle('backend/api/store/getVlcPreferences', getVlcPreferences);
    ipcMain.handle('backend/api/store/setVlcPath', async (event, path) => setVlcPath(path));
    ipcMain.handle('backend/api/store/getVlcPath', getVlcPath);
    ipcMain.handle('backend/api/store/setAcceptedFileExtensions', async (event, acceptedFileExtensions) => setAcceptedFileExtensions(acceptedFileExtensions));
    ipcMain.handle('backend/api/store/getAcceptedFileExtensions', getAcceptedFileExtensions);
});

module.exports = {
    setRemainingPlayTime,
    getRemainingPlayTime,
    setTvSeriesList,
    getTvSeriesList,
    setPlaylistConfig,
    getPlaylistConfig,
    getVlcConfig,
    setVlcPath,
    getVlcPath,
    setVlcPreferences,
    getVlcPreferences,
    setAcceptedFileExtensions,
    getAcceptedFileExtensions,
};
