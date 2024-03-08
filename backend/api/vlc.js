const { spawn } = require('node:child_process');
const os = require('os');
const VLC = require("vlc-client");
const { emitter } = require('./emitter');
const { getVlcConfig } = require('./store');

const defaultVlcPath = ({
    'Linux': '/usr/bin/vlc',
    'Darwin': '/Applications/VLC.app/Contents/MacOS/VLC',
    'Windows_NT': 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
})[os.type()] ?? null;

let currentPlayingMedia = null;
let currentPlayingMediaStartTimestamp = 0;
let currentPlayingMediaExpireTimeoutHandle = null;
let vlcProcess = null;
let vlcClient = null;

async function createVlcProcess() {
    const vlcConfig = getVlcConfig();
    if (!vlcProcess) {
        vlcProcess = spawn(defaultVlcPath, [
            '--extraintf', vlcConfig.extraintf,
            '--http-host', vlcConfig.host,
            '--http-port', vlcConfig.port,
            '--http-password', vlcConfig.password,
            '--image-duration', '-1'
        ]);
        vlcProcess.on('close', () => {
            vlcProcess = null;
        });
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
    currentPlayingMediaStartTimestamp = new Date().getTime();
    clearTimeout(currentPlayingMediaExpireTimeoutHandle);
    currentPlayingMediaExpireTimeoutHandle = setTimeout(() => {
        emitter.emit('backend/api/playlist/next');
    }, media.duration * 1000);
    await createVlcProcess();
    currentPlayingMedia = media;
    await vlcClient.playFile(media.file, { wait: true });
    if (media.playTimeType === 'videoLength') {
        console.log('Expected length: ', media.duration);
        console.log('Actual length: ', await vlcClient.getLength());
        const actualVideoLength = parseInt(await vlcClient.getLength() - await vlcClient.getTime());
        console.log(actualVideoLength);
        clearTimeout(currentPlayingMediaExpireTimeoutHandle);
        currentPlayingMediaExpireTimeoutHandle = setTimeout(() => {
            emitter.emit('backend/api/playlist/next');
        }, actualVideoLength * 1000);
    }
}

async function getPlaybackTime() {
    if (vlcClient) {
        return await vlcClient.getTime();
    }
    return 0;
}

emitter.on('backend/api/vlc/playMedia', playMedia);

