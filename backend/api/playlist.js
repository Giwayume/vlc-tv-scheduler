const { app, ipcMain } = require('electron/main');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const naturalCompare = require('natural-compare-lite');
const { getAcceptedFileExtensions, getTvSeriesList, getPlaylistConfig, getRemainingPlayTime } = require('./store');
const { cronMatchesTimestamp, getNextMatchingTime } = require('./cronjob');
const { emitter } = require('./emitter');

const MAX_SCAN_DEPTH = 64;
const MAX_QUERY_LOOP_COUNT = 65536;

let extensionCheckRegex = /^(3gp|asf|wmv|au|avi|flv|mov|mp4|ogm|ogg|mkv|mka|ts|mpg|mp3|mp2|nsc|nsv|nut|ra|ram|rm|rv|rmbv|a52|dts|aac|flac|dv|vid|tta|tac|ty|wav|dts|xa)$/;

const fileListByTvSeries = new Map();
const fileInfoMap = new Map();
const playlistByTvSeries = new Map();
const playlistLastPlayedIndexByTvSeries = new Map();
const playlistSubsequentPlayCountByTvSeries = new Map();

let currentScanUuid = null;
let sortedTvSeriesList = [];
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

function buildAcceptedFileExtensionRegex() {
    const extensions = getAcceptedFileExtensions();
    let regexString = '^(' + extensions.filter(extension => /^[a-z0-9]{1,}$/i.test(extension)).join('|') + ')$';
    extensionCheckRegex = new RegExp(regexString, 'i');
}

/** Check if file extension is supported */
function isSupportedFileExtension(filename) {
    const extension = filename.split('.').pop();
    return extensionCheckRegex.test(extension);
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

function isFfprobeMediaDetected(ffprobeInfo) {
    return ffprobeInfo.streams.filter(stream => stream.codec_type === 'video' || stream.codec_type === 'audio').length > 0;
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
                    if (isSupportedFileExtension(file)) {
                        fileInfoMap.set(filePath, {
                            size: stat.size,
                        });
                        fileList.push(filePath);
                    }
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
        buildAcceptedFileExtensionRegex();
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
    buildAcceptedFileExtensionRegex();
    const tvSeriesList = getTvSeriesList();
    await Promise.all(tvSeriesList.map((tvSeries) => {
        return scanTvSeries(tvSeries.uuid, scanUuid).catch(() => {});
    }));
    if (currentScanUuid === scanUuid) {
        didScanComplete = true;
        currentScanUuid = null;
    }
    return didScanComplete;
}

/** Research basic information needed about a file, such as how long it will play for. */
async function getFileInfo(filePath) {
    let fileInfo = fileInfoMap.get(filePath) ?? {};
    if (!fileInfo.duration) {
        const ffprobeInfo = await ffprobeAsync(filePath);
        fileInfo.duration = parseInt(getFfprobeInfoDuration(ffprobeInfo));
        fileInfoMap.set(filePath, fileInfo);
    }
    return fileInfo;
}

/** Scans all files and prepares the ordered list of episodes to play. */
async function build() {
    const scanCompleted = await scanAll();
    if (!scanCompleted) return;
    const playlistConfig = getPlaylistConfig();
    sortedTvSeriesList = [...getTvSeriesList()];
    if (playlistConfig.randomizeTvList) {
        shuffle(sortedTvSeriesList);
    }
    for (const tvSeries of sortedTvSeriesList) {
        const fileList = fileListByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeries.playOrder === 'alphabetical') {
            playlistByTvSeries.set(tvSeries.uuid, fileList.sort((a, b) => {
                return naturalCompare(a.toLowerCase(), b.toLowerCase());
            }));
        } else if (tvSeries.playOrder === 'random') {
            playlistByTvSeries.set(tvSeries.uuid, shuffle(fileList));
        }
        const playlistOffset = playlistConfig.randomizeTvSeriesStartOffset
            ? Math.floor(Math.random() * fileList.length) : tvSeries.playlistOffset;
        let playlistIndex = -1 + playlistOffset;
        if (playlistIndex >= fileList.length) playlistIndex = -1;
        if (playlistIndex < -1) playlistIndex += fileList.length;
        if (playlistIndex < -1) playlistIndex = -1;
        playlistLastPlayedIndexByTvSeries.set(tvSeries.uuid, playlistIndex);
        playlistSubsequentPlayCountByTvSeries.set(tvSeries.uuid, 0);
    }
    currentPlayingTvSeriesIndex = 0;
    global.mainWindow.webContents.send('callbacks/playlist/buildCompleted');
}

/** Query for a list of media that shall play in the future, and for how long. (need to call build() before this) */
async function query(episodeCount) {
    let mediaList = [];

    const tvSeriesList = sortedTvSeriesList;
    const playlistLastPlayedIteratorByTvSeries = new Map();
    const playlistSubsequentPlayIteratorByTvSeries = new Map();
    for (const tvSeries of tvSeriesList) {
        playlistLastPlayedIteratorByTvSeries.set(tvSeries.uuid, playlistLastPlayedIndexByTvSeries.get(tvSeries.uuid) ?? -1);
        playlistSubsequentPlayIteratorByTvSeries.set(tvSeries.uuid, playlistSubsequentPlayCountByTvSeries.get(tvSeries.uuid) ?? 0);
    }

    const queryState = {
        timestamp: new Date().getTime() + Math.round(getRemainingPlayTime() / 1000),
        currentPlayingTvSeriesIndex,
        playlistLastPlayedIndexByTvSeries: playlistLastPlayedIteratorByTvSeries,
        playlistSubsequentPlayCountByTvSeries: playlistSubsequentPlayIteratorByTvSeries,
    }

    for (let episodeIndex = 0; episodeIndex < episodeCount; episodeIndex++) {
        mediaList.push(
            await queryNext(queryState)
        );
    }

    return mediaList;
}

/** Queries for the next media in the playlist based on the provided query state. (need to call build() before this) */
async function queryNext(queryState) {
    let media = null;
    const timestamp = queryState.timestamp ?? new Date().getTime();
    let totalLoopCount = 0;
    const tvSeriesList = sortedTvSeriesList;

    // Determine first if any TV series in the list can play, due to schedule restraints.
    if (
        queryState.currentPlayingTvSeriesIndex < 0 || queryState.currentPlayingTvSeriesIndex >= tvSeriesList.length
    ) queryState.currentPlayingTvSeriesIndex = 0;
    let nextTvSeriesTime = Infinity;
    let nextTvSeriesIndex = null;
    for (
        const tvSeries of [
            ...tvSeriesList.slice(queryState.currentPlayingTvSeriesIndex, tvSeriesList.length),
            ...tvSeriesList.slice(0, queryState.currentPlayingTvSeriesIndex)
        ]
    ) {
        const tvSeriesFileList = playlistByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeriesFileList.length === 0) continue;
        if (cronMatchesTimestamp(tvSeries.cron, timestamp)) {
            nextTvSeriesTime = Infinity;
            nextTvSeriesIndex = null;
            break;
        }
        let nextTime = getNextMatchingTime(tvSeries.cron, timestamp).getTime();
        if (nextTime < nextTvSeriesTime) {
            nextTvSeriesTime = nextTime;
            nextTvSeriesIndex = tvSeriesList.indexOf(tvSeries);
        }
    }
    if (nextTvSeriesIndex != null) {
        queryState.timestamp = nextTvSeriesTime;
        return {
            file: null,
            duration: Math.round((nextTvSeriesTime - timestamp) / 1000),
            playTimeType: 'exactLength',
        };
    }

    while (totalLoopCount <= MAX_QUERY_LOOP_COUNT) {
        totalLoopCount++;
        if (
            queryState.currentPlayingTvSeriesIndex < 0 || queryState.currentPlayingTvSeriesIndex >= tvSeriesList.length
        ) queryState.currentPlayingTvSeriesIndex = 0;
        const tvSeries = tvSeriesList[queryState.currentPlayingTvSeriesIndex];
        const tvSeriesFileList = playlistByTvSeries.get(tvSeries.uuid) ?? [];
        if (tvSeriesFileList.length === 0 || !cronMatchesTimestamp(tvSeries.cron, queryState.timestamp)) {
            queryState.currentPlayingTvSeriesIndex++;
            continue;
        }
        let playIndex = queryState.playlistLastPlayedIndexByTvSeries.get(tvSeries.uuid) + 1;
        if (playIndex >= tvSeriesFileList.length) playIndex = 0;
        queryState.playlistLastPlayedIndexByTvSeries.set(tvSeries.uuid, playIndex);
        const file = tvSeriesFileList[playIndex];
        let duration = 3600;
        if (!queryState.ignoreMediaChecks) {
            const fileInfo = await getFileInfo(file);
            duration = tvSeries.playTimeType === 'exactLength' ? tvSeries.playTime : fileInfo.duration;
        }
        media = {
            file,
            duration,
            playTimeType: tvSeries.playTimeType,
        };
        queryState.timestamp = queryState.timestamp + (duration * 1000);
        let subsequentCount = (queryState.playlistSubsequentPlayCountByTvSeries.get(tvSeries.uuid) ?? 0) + 1;
        if (subsequentCount >= tvSeries.playCount) {
            subsequentCount = 0;
            queryState.currentPlayingTvSeriesIndex += 1;
        }
        queryState.playlistSubsequentPlayCountByTvSeries.set(tvSeries.uuid, subsequentCount);
        break;
    }
    return media;
}

/** Advances the playlist and returns the next media to play. (need to call build() before this) */
async function next() {
    const queryState = {
        timestamp: new Date().getTime(),
        currentPlayingTvSeriesIndex,
        playlistLastPlayedIndexByTvSeries,
        playlistSubsequentPlayCountByTvSeries,
    }
    const media = await queryNext(queryState);
    currentPlayingTvSeriesIndex = queryState.currentPlayingTvSeriesIndex;
    emitter.emit('backend/api/vlc/playMedia', media);
    return media;
}

/** Advances the playlist by the specified count and plays the media. (need to call build() before this) */
async function jump(count) {
    let media = null;
    for (let i = 0; i < count; i++) {
        const queryState = {
            timestamp: new Date().getTime(),
            currentPlayingTvSeriesIndex,
            playlistLastPlayedIndexByTvSeries,
            playlistSubsequentPlayCountByTvSeries,
            ignoreMediaChecks: i < count - 1,
        }
        media = await queryNext(queryState);
        currentPlayingTvSeriesIndex = queryState.currentPlayingTvSeriesIndex;
    }
    emitter.emit('backend/api/vlc/playMedia', media);
    return media;
}

/** Builds playlist then sends first media in playlist to VLC */
async function autoplay() {
    await build();
    await next();
}

emitter.on('backend/api/playlist/autoplay', autoplay);
emitter.on('backend/api/playlist/next', next);

app.whenReady().then(() => {
    ipcMain.handle('backend/api/playlist/build', build);
    ipcMain.handle('backend/api/playlist/next', next);
    ipcMain.handle('backend/api/playlist/jump', async (event, count) => jump(count));
    ipcMain.handle('backend/api/playlist/query', async (event, count) => query(count));
    ipcMain.handle('backend/api/playlist/scanAll', scanAll);
});

module.exports = {
    build,
    query,
    next,
    scanAll,
};
