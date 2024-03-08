const { defineStore } = Pinia;

export const useConfigurationStore = defineStore('configurationStore', {
    state: () => {
        return {
            tvSeriesList: [],
        };
    },
    actions: {
        async initialize() {
            this.tvSeriesList = await window.backend.store.getTvSeriesList();
        },
        setTvSeriesList(tvSeriesList) {
            this.tvSeriesList = tvSeriesList;
            window.backend.store.setTvSeriesList(
                JSON.parse(JSON.stringify(tvSeriesList))
            );
        }
    }
});
