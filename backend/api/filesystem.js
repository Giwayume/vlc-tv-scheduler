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

ipcMain.on('frontend/preload', (event) => {
    mainWindow = BrowserWindow.fromWebContents(event.sender);
});

app.whenReady().then(() => {
    ipcMain.handle('backend/api/filesystem/pickDirectories', pickDirectories);
});
