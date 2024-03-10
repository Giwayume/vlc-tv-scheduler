const { defineStore } = Pinia;

let updateBackendPlaylistConfigTimerHandle = null;

export const usePlaylistStore = defineStore('playlistStore', {
    state: () => {
        return {
            isBuildCompleted: false,
            randomizeTvList: false,
            enableTimebox: false,
            timeboxIntervalSeconds: 900,
        };
    },
    actions: {
        async initialize() {
            const { randomizeTvList, enableTimebox, timeboxIntervalSeconds } = await backend.store.getPlaylistConfig();
            this.randomizeTvList = randomizeTvList;
            this.enableTimebox = enableTimebox;
            this.timeboxIntervalSeconds = timeboxIntervalSeconds;
        },
        async queryRemainingPlayTime() {
            return await backend.store.getRemainingPlayTime();
        },
        setIsBuildCompleted(isBuildCompleted) {
            this.isBuildCompleted = isBuildCompleted;
        },
        setRandomizeTvList(randomizeTvList) {
            this.randomizeTvList = randomizeTvList;
            this.queueUpdateBackendPlaylistConfig();
        },
        setEnableTimebox(enableTimebox) {
            this.enableTimebox = enableTimebox;
            this.queueUpdateBackendPlaylistConfig();
        },
        setTimeboxIntervalSeconds(timeboxIntervalSeconds) {
            this.timeboxIntervalSeconds = timeboxIntervalSeconds;
            this.queueUpdateBackendPlaylistConfig();
        },
        queueUpdateBackendPlaylistConfig() {
            clearTimeout(updateBackendPlaylistConfigTimerHandle);
            updateBackendPlaylistConfigTimerHandle = setTimeout(() => {
                this.updateBackendPlaylistConfig();
            }, 1);
        },
        updateBackendPlaylistConfig() {
            backend.store.setPlaylistConfig({
                randomizeTvList: this.randomizeTvList,
                enableTimebox: this.enableTimebox,
                timeboxIntervalSeconds: this.timeboxIntervalSeconds,
            });
        }
    }
});
