const { defineStore } = Pinia;

export const useConfigurationStore = defineStore('configurationStore', {
    state: () => {
        return {
            acceptedFileExtensions: [],
            tvSeriesList: [],
        };
    },
    actions: {
        async initialize() {
            this.acceptedFileExtensions = await window.backend.store.getAcceptedFileExtensions();
            this.tvSeriesList = await window.backend.store.getTvSeriesList();
        },
        setAcceptedFileExtensions(acceptedFileExtensions) {
            this.acceptedFileExtensions = acceptedFileExtensions;
            window.backend.store.setAcceptedFileExtensions(
                JSON.parse(JSON.stringify(acceptedFileExtensions))
            );
        },
        setTvSeriesList(tvSeriesList) {
            this.tvSeriesList = tvSeriesList;
            window.backend.store.setTvSeriesList(
                JSON.parse(JSON.stringify(tvSeriesList))
            );
        }
    }
});
