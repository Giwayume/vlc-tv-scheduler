const { app, ipcMain } = require('electron/main');
const { spawn } = require('node:child_process');
const VLC = require("vlc-client");
const { emitter } = require('./emitter');
const { setRemainingPlayTime, getVlcConfig, getVlcPath } = require('./store');

let currentPlayingMedia = null;
let currentPlayingMediaStartTimestamp = 0;
let currentPlayingMediaExpireTimeoutHandle = null;
let checkVideoEndIntervalHandle = null;
let vlcProcess = null;
let vlcClient = null;

async function createVlcProcess() {
    const vlcConfig = getVlcConfig();
    const vlcPath = getVlcPath();
    if (vlcPath == null) return;
    if (!vlcProcess) {
        try {
            vlcProcess = spawn(vlcPath, [
                '--extraintf', vlcConfig.extraintf,
                '--http-host', vlcConfig.host,
                '--http-port', vlcConfig.port,
                '--http-password', vlcConfig.password,
                '--image-duration', '-1'
            ]);
            if (!vlcProcess) return;
            checkVideoEndIntervalHandle = setInterval(checkVideoEnd, 2000);
            vlcProcess.on('error', (err) => {
                console.log("\n\t\tERROR: spawn failed! (" + err + ")");
                vlcProcess = null;
            });
            vlcProcess.on('close', () => {
                clearInterval(checkVideoEndIntervalHandle);
                vlcProcess = null;
            });
        } catch (error) {
            vlcProcess = null;
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }
    if (!vlcClient) {
        vlcClient = new VLC.Client({
            ip: vlcConfig.host,
            port: vlcConfig.port,
            password: vlcConfig.password
        });
    }
}

async function playMedia(media) {
    if (media == null) {
        if (vlcClient) {
            vlcClient.stop();
        }
        return;
    }

    try {
        currentPlayingMediaStartTimestamp = new Date().getTime();
        queueNextPlaylistItem(media.duration);

        currentPlayingMedia = null;

        await createVlcProcess();
        await vlcClient.playFile(media.file, { wait: true });
        currentPlayingMedia = media;

        if (media.playTimeType === 'videoLength') {
            const actualVideoLength = parseInt(await vlcClient.getLength() - await vlcClient.getTime());
            queueNextPlaylistItem(actualVideoLength);
        }

        const [playLength, playTime] = await Promise.all([
            await vlcClient.getLength(),
            await vlcClient.getTime(),
        ]);
        setRemainingPlayTime(playLength - playTime);
        global.mainWindow.webContents.send('callbacks/playlist/nextMediaStarted');
    } catch (error) {
        global.mainWindow.webContents.send('callbacks/playlist/nextMediaStartFailed');
    }
}

async function exit() {
    clearInterval(checkVideoEndIntervalHandle);
    clearTimeout(currentPlayingMediaExpireTimeoutHandle);
    if (vlcProcess) {
        vlcProcess.kill();
        vlcProcess = null;
    }
    if (vlcClient) {
        vlcClient = null;
    }
    setRemainingPlayTime(0);
}

/** Poll VLC to check if the video has ended sooner than expected, and advance the playlist. */
async function checkVideoEnd() {
    if (vlcProcess == null) {
        clearInterval(checkVideoEndIntervalHandle);
        setRemainingPlayTime(0);
        return;
    }
    if (currentPlayingMedia != null) {
        const [isStopped, playLength, playTime] = await Promise.all([
            await vlcClient.isStopped(),
            await vlcClient.getLength(),
            await vlcClient.getTime(),
        ]);
        setRemainingPlayTime(playLength - playTime);
        if (isStopped || playTime >= playLength - 1) {
            clearTimeout(currentPlayingMediaExpireTimeoutHandle);
            emitter.emit('backend/api/playlist/next');
        }
    }
}

/** Queue the playlist to advance at the expected duration */
function queueNextPlaylistItem(durationInSeconds) {
    clearTimeout(currentPlayingMediaExpireTimeoutHandle);
    currentPlayingMediaExpireTimeoutHandle = setTimeout(() => {
        emitter.emit('backend/api/playlist/next');
    }, durationInSeconds * 1000);
}

emitter.on('backend/api/vlc/playMedia', playMedia);

app.whenReady().then(() => {
    ipcMain.handle('backend/api/vlc/exit', exit);
});