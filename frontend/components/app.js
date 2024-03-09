import { useConfigurationStore } from '../store/configuration.js';
import { usePlaylistStore } from '../store/playlist.js';
import { useVlcStore } from '../store/vlc.js';
import emitter from '../lib/emitter.js';

const template = `
<router-view />
`;

const AppComponent = {
    template,
    setup() {
        const configurationStore = useConfigurationStore();
        configurationStore.initialize();

        const playlistStore = usePlaylistStore();
        backend.playlist.onBuildCompleted(() => {
            playlistStore.setIsBuildCompleted(true);
        });
        backend.playlist.onNextMediaStarted(() => {
            emitter.emit('playlist/nextMediaStarted');
        });

        const vlcStore = useVlcStore();
        vlcStore.initialize();
    }
};

export default AppComponent;
