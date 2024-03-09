const { app, ipcMain } = require('electron/main');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const { getRemainingPlayTime, getTvSeriesList } = require('./store');
const { cronMatchesTimestamp } = require('./cronjob');
const { emitter } = require('./emitter');

const MAX_SCAN_DEPTH = 64;
const MAX_QUERY_LOOP_COUNT = 65536;

const fileListByTvSeries = new Map();
const fileInfoMap = new Map();
const playlistByTvSeries = new Map();
const playlistLastPlayedIndexByTvSeries = new Map();
const playlistSubsequentPlayCountByTvSeries = new Map();

let currentScanUuid = null;
let currentPlayingTvSeriesIndex = 0;

function uuid() {
    return crypto.randomBytes(16).toString("hex");
}

/** Randomize the order of an array */
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
}

/** ffprobe promise wrapper */
function ffprobeAsync(filePath) {
    return new Promise((resolve, reject) => {
        ffprobe(filePath, { path: ffprobeStatic.path }, function(err, info) {
            if (err) {
                reject(err);
            } else {
                resolve(info);
            }
        });
    });
}

/** Find out how long a media file is supposed to play, based on the ffprobe response. */
function getFfprobeInfoDuration(ffprobeInfo) {
    let duration = 0;
    const streams = ffprobeInfo.streams.sort((a, b) => {
        if (a.codec_type === 'video' && b.codec_type !== 'video') return -1;
        if (a.codec_type !== 'video' && b.codec_type === 'video') return 1;
        if (a.codec_type === 'audio' && b.codec_type !== 'audio') return -1;
        if (a.codec_type !== 'audio' && b.codec_type === 'audio') return 1;
        return 0;
    });
    findDuration:
    for (const stream of streams) {
        if (stream.duration) {
            duration = parseFloat(stream.duration);
            break findDuration;
        }
        const durationTags = Object.keys(stream.tags ?? {}).filter(tag => tag.toLowerCase().startsWith('duration'));
        for (const durationTag of durationTags) {
            const tagValue = stream.tags[durationTag];
            if (/^[0-9]{1,}\:[0-9]{2}\:[0-9]{2}\.[0-9]{1,}$/.test(tagValue)) {
                const tagValueSplit = tagValue.split('.')[0].split(':');
                duration = (parseInt(tagValueSplit[0]) * 3600) + (parseInt(tagValueSplit[1]) * 60) + parseInt(tagValueSplit[2]);
                break findDuration;
            }
        }
    }
    return duration;
}

/** Recursively scan for media files in the sepecified folder. */
async function scanForMediaFilesInDirectory(parentDirectory, scanUuid, depth = 0) {
    if (depth >= MAX_SCAN_DEPTH) return [];
    let fileList = [];
    try {
        const files = await fsPromises.readdir(parentDirectory);
        if (currentScanUuid !== scanUuid) return [];
        for (const file of files) {
            const filePath = path.join(parentDirectory, file);
            try {
                const stat = await fsPromises.lstat(filePath);
                if (currentScanUuid !== scanUuid) return [];
                if (stat.isFile()) {
                    const ffprobeInfo = await ffprobeAsync(filePath);
                    if (currentScanUuid !== scanUuid) return [];
                    fileInfoMap.set(filePath, {
                        size: stat.size,
                        duration: parseInt(getFfprobeInfoDuration(ffprobeInfo)),
                    });
                    fileList.push(filePath);
                } else {
                    fileList = fileList.concat(
                        await scanForMediaFilesInDirectory(filePath, scanUuid, depth + 1)
                    );
                    if (currentScanUuid !== scanUuid) return [];
                }
            } catch (error) {
                console.error('[api/playlist/scanForMediaFilesInDirectory] Error scanning file: ', filePath);
            }
        }
    } catch (error) {
        console.error('[api/playlist/scanForMediaFilesInDirectory] Error reading file list: ', parentDirectory);
    }
    return fileList;
}

/** Find media files for a specific configured TV series folder. */
async function scanTvSeries(tvSeriesUuid, scanUuid = null) {
    let isInitiatedScan = false;
    if (scanUuid === null) {
        isInitiatedScan = true;
        scanUuid = uuid();
        currentScanUuid = scanUuid;
    }
    if (currentScanUuid !== scanUuid) return;
    const tvSeriesList = getTvSeriesList();
    const tvSeries = tvSeriesList.filter(series => series.uuid === tvSeriesUuid)[0];
    if (!tvSeries) return;
    const fileList = await scanForMediaFilesInDirectory(tvSeries.folder, scanUuid);
    if (currentScanUuid !== scanUuid) return;
    fileListByTvSeries.set(tvSeries.uuid, fileList);
    if (isInitiatedScan && currentScanUuid === scanUuid) {
        currentScanUuid = null;
    }
}

/** Find media files in the configured TV series folders, and basic info about them (such as play length). */
async function scanAll() {
    let didScanComplete = false;
    const scanUuid = uuid();
    currentScanUuid = scanUuid;
    const tvSeriesList = getTvSeriesList();
    for (const tvSeries of tvSeriesList) {
        try {
            await scanTvSeries(tvSeries.uuid, scanUuid);
        } catch (error) {
            console.error('[api/playlist/scanAll] Error scanning series: ', tvSeries.folder);
        }
    }
    if (currentScanUuid === scanUuid) {
        didScanComplete = true;
        currentScanUuid = null;
    }
    return didScanComplete;
}

/** Scans all files and prepares the ordered list of episodes to play. */
async function build() {
    const scanCompleted = await scanAll();
    if (!scanCompleted) return;
    const tvSeriesList = getTvSeriesList();
    for (const tvSeries of tvSeriesList) {
        const fileList = fileListByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeries.playOrder === 'alphabetical') {
            playlistByTvSeries.set(tvSeries.uuid, fileList.sort());
        } else if (tvSeries.playOrder === 'random') {
            playlistByTvSeries.set(tvSeries.uuid, shuffle(fileList));
        }
        playlistLastPlayedIndexByTvSeries.set(tvSeries.uuid, -1);
        playlistSubsequentPlayCountByTvSeries.set(tvSeries.uuid, 0);
    }
    currentPlayingTvSeriesIndex = 0;
    global.mainWindow.webContents.send('callbacks/playlist/buildCompleted');
}

/** Query for a list of media that shall play in the future, and for how long. (need to call build() before this) */
async function query(episodeCount) {
    let totalLoopCount = 0;
    let timestampIterator = new Date().getTime() + (getRemainingPlayTime() * 1000);
    let mediaList = [];
    const tvSeriesList = getTvSeriesList();
    let currentPlayingTvSeriesIterator = currentPlayingTvSeriesIndex;
    const playlistLastPlayedIteratorByTvSeries = new Map();
    const playlistSubsequentPlayIteratorByTvSeries = new Map();
    for (const tvSeries of tvSeriesList) {
        playlistLastPlayedIteratorByTvSeries.set(tvSeries.uuid, playlistLastPlayedIndexByTvSeries.get(tvSeries.uuid) ?? -1);
        playlistSubsequentPlayIteratorByTvSeries.set(tvSeries.uuid, playlistSubsequentPlayCountByTvSeries.get(tvSeries.uuid) ?? 0);
    }
    let episodeIndex = 0;
    while (episodeIndex < episodeCount) {
        totalLoopCount++
        if (totalLoopCount >= MAX_QUERY_LOOP_COUNT) break;
        if (currentPlayingTvSeriesIterator < 0 || currentPlayingTvSeriesIterator >= tvSeriesList.length) currentPlayingTvSeriesIterator = 0;
        const tvSeries = tvSeriesList[currentPlayingTvSeriesIterator];
        const tvSeriesFileList = playlistByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeriesFileList.length === 0 || !cronMatchesTimestamp(tvSeries.cron, timestampIterator)) {
            currentPlayingTvSeriesIterator++;
            continue;
        }
        let playIndex = playlistLastPlayedIteratorByTvSeries.get(tvSeries.uuid) + 1;
        if (playIndex >= tvSeriesFileList.length) playIndex = 0;
        playlistLastPlayedIteratorByTvSeries.set(tvSeries.uuid, playIndex);
        const file = tvSeriesFileList[playIndex];
        const fileInfo = fileInfoMap.get(file) ?? { duration: 0 };
        const duration = tvSeries.playTimeType === 'exactLength' ? tvSeries.playTime : fileInfo.duration;
        mediaList.push({
            file,
            duration,
        });
        timestampIterator += duration;
        let subsequentCount = (playlistSubsequentPlayIteratorByTvSeries.get(tvSeries.uuid) ?? 0) + 1;
        if (subsequentCount >= tvSeries.playCount) {
            subsequentCount = 0;
            currentPlayingTvSeriesIterator += 1;
        }
        playlistSubsequentPlayIteratorByTvSeries.set(tvSeries.uuid, subsequentCount);
        episodeIndex++;
    }
    return mediaList;
}

/** Advances the playlist and returns the next media to play. (need to call build() before this) */
async function next() {
    let media = null;
    const timestamp = new Date().getTime();
    let totalLoopCount = 0;
    const tvSeriesList = getTvSeriesList();
    while (totalLoopCount <= MAX_QUERY_LOOP_COUNT) {
        totalLoopCount++;
        if (currentPlayingTvSeriesIndex < 0 || currentPlayingTvSeriesIndex >= tvSeriesList.length) currentPlayingTvSeriesIndex = 0;
        const tvSeries = tvSeriesList[currentPlayingTvSeriesIndex];
        const tvSeriesFileList = playlistByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeriesFileList.length === 0 || !cronMatchesTimestamp(tvSeries.cron, timestamp)) {
            currentPlayingTvSeriesIndex++;
            continue;
        }
        let playIndex = playlistLastPlayedIndexByTvSeries.get(tvSeries.uuid) + 1;
        if (playIndex >= tvSeriesFileList.length) playIndex = 0;
        playlistLastPlayedIndexByTvSeries.set(tvSeries.uuid, playIndex);
        const file = tvSeriesFileList[playIndex];
        const fileInfo = fileInfoMap.get(file) ?? { duration: 0 };
        const duration = tvSeries.playTimeType === 'exactLength' ? tvSeries.playTime : fileInfo.duration;
        media = {
            file,
            duration,
            playTimeType: tvSeries.playTimeType,
        };
        let subsequentCount = (playlistSubsequentPlayCountByTvSeries.get(tvSeries.uuid) ?? 0) + 1;
        if (subsequentCount >= tvSeries.playCount) {
            subsequentCount = 0;
            currentPlayingTvSeriesIndex += 1;
        }
        playlistSubsequentPlayCountByTvSeries.set(tvSeries.uuid, subsequentCount);
    }
    emitter.emit('backend/api/vlc/playMedia', media);
    return media;
}

emitter.on('backend/api/playlist/next', next);

app.whenReady().then(() => {
    ipcMain.handle('backend/api/playlist/build', build);
    ipcMain.handle('backend/api/playlist/next', next);
    ipcMain.handle('backend/api/playlist/query', async (event, count) => query(count));
    ipcMain.handle('backend/api/playlist/scanAll', scanAll);
});

module.exports = {
    build,
    query,
    next,
    scanAll,
};
