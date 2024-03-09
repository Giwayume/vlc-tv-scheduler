const { defineStore } = Pinia;

export const usePlaylistStore = defineStore('playlistStore', {
    state: () => {
        return {
            isBuildCompleted: false,
        };
    },
    actions: {
        async queryRemainingPlayTime() {
            return await backend.store.getRemainingPlayTime();
        },
        setIsBuildCompleted(isBuildCompleted) {
            this.isBuildCompleted = isBuildCompleted;
        }
    }
});
