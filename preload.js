const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backend', {
    filesystem: {
        pickDirectories: () => ipcRenderer.invoke('backend/api/filesystem/pickDirectories'),
    },
    playlist: {
        build: () => ipcRenderer.invoke('backend/api/playlist/build'),
        query: (count) => ipcRenderer.invoke('backend/api/playlist/query', count),
        next: () => ipcRenderer.invoke('backend/api/playlist/next'),
        scanAll: () => ipcRenderer.invoke('backend/api/playlist/scanAll'),
    },
    store: {
        setTvSeriesList: (tvSeriesList) => ipcRenderer.invoke('backend/api/store/setTvSeriesList', tvSeriesList),
        getTvSeriesList: () => ipcRenderer.invoke('backend/api/store/getTvSeriesList'),
    },
});

ipcRenderer.send('frontend/preload');