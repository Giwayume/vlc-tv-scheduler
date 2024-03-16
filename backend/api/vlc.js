const { app, ipcMain } = require('electron/main');
const { spawn } = require('node:child_process');
const VLC = require("vlc-client");
const { emitter } = require('./emitter');
const { killPort } = require('./process');
const { setRemainingPlayTime, getVlcConfig, getVlcPath, getVlcPreferences } = require('./store');

let currentPlayingMedia = null;
let currentPlayingMediaStartTimestamp = 0;
let checkVideoEndIntervalHandle = null;
let autoScheduledRestartTimeoutHandle = null;
let isAutoScheduledRestartPending = false;
let vlcProcess = null;
let vlcClient = null;

async function createVlcProcess() {
    const vlcConfig = getVlcConfig();
    const vlcPath = getVlcPath();
    if (vlcPath == null) return;
    if (!vlcProcess) {
        clearInterval(autoScheduledRestartTimeoutHandle);
        isAutoScheduledRestartPending = false;

        try {
            if (vlcConfig.host === 'localhost' || vlcConfig.host === '127.0.0.1') {
                await killPort(vlcConfig.port);
            }
        } catch (error) {}

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

        const { autoScheduleRestarts, restartInterval } = getVlcPreferences();
        if (autoScheduleRestarts) {
            autoScheduledRestartTimeoutHandle = setTimeout(() => {
                isAutoScheduledRestartPending = true;
            }, restartInterval * 1000);
        }
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
        if (isAutoScheduledRestartPending) {
            isAutoScheduledRestartPending = false;
            await exit();
        }

        currentPlayingMediaStartTimestamp = new Date().getTime();
        setRemainingPlayTime(media.duration);

        currentPlayingMedia = null;

        await createVlcProcess();
        vlcClient.emptyPlaylist();
        await vlcClient.playFile(media.file, { wait: true });
        currentPlayingMedia = media;

        const [playLength, playTime] = await Promise.all([
            await vlcClient.getLength(),
            await vlcClient.getTime(),
        ]);

        const actualVideoLength = playLength - playTime;

        if (actualVideoLength >= 1) {
            setRemainingPlayTime(actualVideoLength);
        }

        global.mainWindow.webContents.send('callbacks/playlist/nextMediaStarted');
    } catch (error) {
        global.mainWindow.webContents.send('callbacks/playlist/nextMediaStartFailed');
        console.error('[api/vlc/playMedia] Error occurred when starting media ', error);
        setTimeout(() => {
            playMedia(media);
        }, 5000);
    }
}

async function exit() {
    clearInterval(checkVideoEndIntervalHandle);
    if (vlcProcess) {
        vlcProcess.kill();
        vlcProcess = null;
    }
    if (vlcClient) {
        vlcClient = null;
    }
    setRemainingPlayTime(0);
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
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
        const actualVideoLength = playLength - playTime;
        if (actualVideoLength < 0) return;
        setRemainingPlayTime(actualVideoLength);
        if (isStopped || playTime >= playLength - 1) {
            emitter.emit('backend/api/playlist/next');
        }
    }
}

emitter.on('backend/api/vlc/playMedia', playMedia);

app.whenReady().then(() => {
    ipcMain.handle('backend/api/vlc/exit', exit);
});