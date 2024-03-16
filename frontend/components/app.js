import { useConfigurationStore } from '../store/configuration.js';
import { usePlaylistStore } from '../store/playlist.js';
import { useVlcStore } from '../store/vlc.js';
import emitter from '../lib/emitter.js';

const { ref } = Vue;

const template = `
<router-view v-if="isInitialzed" />
`;

const AppComponent = {
    template,
    setup() {

        const isInitialzed  = ref(false);

        async function initialize() {
            const configurationStore = useConfigurationStore();
            await configurationStore.initialize();

            const playlistStore = usePlaylistStore();
            await playlistStore.initialize();
            backend.playlist.onBuildCompleted(() => {
                playlistStore.setIsBuildCompleted(true);
            });
            backend.playlist.onNextMediaStarted(() => {
                emitter.emit('playlist/nextMediaStarted');
            });

            const vlcStore = useVlcStore();
            await vlcStore.initialize();

            isInitialzed.value = true;
        }
        initialize();

        return {
            isInitialzed,
        };
    }
};

export default AppComponent;
