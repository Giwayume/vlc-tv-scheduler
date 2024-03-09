const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backend', {
    filesystem: {
        pickDirectories: () => ipcRenderer.invoke('backend/api/filesystem/pickDirectories'),
        openPath: (path) => ipcRenderer.invoke('backend/api/filesystem/openPath', path),
        openUserDataFolder: () => ipcRenderer.invoke('backend/api/filesystem/openUserDataFolder'),
    },
    playlist: {
        onBuildCompleted: (callback) => ipcRenderer.on('callbacks/playlist/buildCompleted', (_event, value) => callback(value)),
        onNextMediaStarted: (callback) => ipcRenderer.on('callbacks/playlist/nextMediaStarted', (_event, value) => callback(value)),
        build: () => ipcRenderer.invoke('backend/api/playlist/build'),
        query: (count) => ipcRenderer.invoke('backend/api/playlist/query', count),
        next: () => ipcRenderer.invoke('backend/api/playlist/next'),
        scanAll: () => ipcRenderer.invoke('backend/api/playlist/scanAll'),
    },
    store: {
        getRemainingPlayTime: () => ipcRenderer.invoke('backend/api/store/getRemainingPlayTime'),
        setTvSeriesList: (tvSeriesList) => ipcRenderer.invoke('backend/api/store/setTvSeriesList', tvSeriesList),
        getTvSeriesList: () => ipcRenderer.invoke('backend/api/store/getTvSeriesList'),
        setVlcConfig: (vlcConfig) => ipcRenderer.invoke('backend/api/store/setVlcConfig', vlcConfig),
        getVlcConfig: () => ipcRenderer.invoke('backend/api/store/getVlcConfig'),
        setVlcPath: (vlcPath) => ipcRenderer.invoke('backend/api/store/setVlcPath', vlcPath),
        getVlcPath: () => ipcRenderer.invoke('backend/api/store/getVlcPath'),
    },
    vlc: {
        exit: () => ipcRenderer.invoke('backend/api/vlc/exit'),
    },
});

ipcRenderer.send('frontend/preload');