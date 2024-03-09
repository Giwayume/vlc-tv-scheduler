const { shell } = require('electron');
const { app, ipcMain, BrowserWindow } = require('electron/main');
const { dialog } = require('electron');

let mainWindow = null;

function pickDirectories() {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog(mainWindow, {
            title: 'Choose One or More Folders',
            properties: ['openDirectory', 'multiSelections']
        }).then(result => {
            if (!result.canceled) {
                resolve(result.filePaths);
            } else {
                reject(result);
            }
        }).catch(err => {
            reject(err);
        });
    });
}

function openPath(folderPath) {
    shell.openPath(folderPath);
}

function openUserDataFolder() {
    const folder = app.getPath('userData');
    openPath(folder);
}

ipcMain.on('frontend/preload', (event) => {
    mainWindow = BrowserWindow.fromWebContents(event.sender);
});

app.whenReady().then(() => {
    ipcMain.handle('backend/api/filesystem/pickDirectories', pickDirectories);
    ipcMain.handle('backend/api/filesystem/openPath', async (event, path) => openPath(path));
    ipcMain.handle('backend/api/filesystem/openUserDataFolder', openUserDataFolder);
});
