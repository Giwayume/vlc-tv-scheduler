const { defineStore } = Pinia;

let updateBackendVlcConfigTimerHandle = null;
let updateBackendVlcPreferencesTimerHandle = null;

export const useVlcStore = defineStore('vlcStore', {
    state: () => {
        return {
            path: '',
            host: '127.0.0.1',
            port: 8080,
            password: 'vlcremote',
            extraintf: 'http,luaintf',
            options: [],
            autoScheduleRestarts: true,
            restartInterval: 86400,
            pauseSkipTime: 10,
            isPlaying: false,
        };
    },
    actions: {
        async initialize() {
            this.path = (await backend.store.getVlcPath()) ?? '';
            const { host, port, password, extraintf } = await backend.store.getVlcConfig();
            this.host = host;
            this.port = port;
            this.password = password;
            this.extraintf = extraintf;
            const { autoScheduleRestarts, restartInterval, pauseSkipTime } = await backend.store.getVlcPreferences();
            this.autoScheduleRestarts = autoScheduleRestarts;
            this.restartInterval = restartInterval;
            this.pauseSkipTime = pauseSkipTime;

            backend.playlist.onNextMediaStarted(() => {
                this.isPlaying = true;
            });
            backend.vlc.onExit(() => {
                this.isPlaying = false;
            });
        },
        setPath(path) {
            this.path = path;
            backend.store.setVlcPath(path);
        },
        setHost(host) {
            this.host = host;
            this.queueUpdateBackendVlcConfig();
        },
        setPort(port) {
            this.port = port;
            this.queueUpdateBackendVlcConfig();
        },
        setPassword(password) {
            this.password = password;
            this.queueUpdateBackendVlcConfig();
        },
        setExtraintf(extraintf) {
            this.extraintf = extraintf;
            this.queueUpdateBackendVlcConfig();
        },
        setAutoScheduleRestarts(autoScheduleRestarts) {
            this.autoScheduleRestarts = autoScheduleRestarts;
            this.queueUpdateBackendVlcPreferences();
        },
        setRestartInterval(restartInterval) {
            this.restartInterval = restartInterval;
            this.queueUpdateBackendVlcPreferences();
        },
        setPauseSkipTime(pauseSkipTime) {
            this.pauseSkipTime = pauseSkipTime;
            this.queueUpdateBackendVlcPreferences();
        },
        queueUpdateBackendVlcConfig() {
            clearTimeout(updateBackendVlcConfigTimerHandle);
            updateBackendVlcConfigTimerHandle = setTimeout(() => {
                this.updateBackendVlcConfig();
            }, 1);
        },
        updateBackendVlcConfig() {
            backend.store.setVlcConfig({
                host: this.host,
                port: this.port,
                password: this.password,
                extraintf: this.extraintf,
                options: JSON.parse(JSON.stringify(this.options)),
            });
        },
        queueUpdateBackendVlcPreferences() {
            clearTimeout(updateBackendVlcPreferencesTimerHandle);
            updateBackendVlcPreferencesTimerHandle = setTimeout(() => {
                this.updateBackendVlcPreferences();
            }, 1);
        },
        updateBackendVlcPreferences() {
            backend.store.setVlcPreferences({
                autoScheduleRestarts: this.autoScheduleRestarts,
                restartInterval: this.restartInterval,
                pauseSkipTime: this.pauseSkipTime,
            });
        },
    }
});
