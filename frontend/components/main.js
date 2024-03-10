import { usePlaylistStore } from '../store/playlist.js';

const template = `
<v-layout>
    <v-app-bar :elevation="2" color="primary">
        <template v-slot:prepend>
            <v-tabs
                v-model="tab"
                style="margin-left: 8px"
            >
                <v-tab
                    value="media"
                >
                    {{ $t('media.title') }}
                </v-tab>
                <v-tab
                    value="playlist"
                >
                    {{ $t('playlist.title') }}
                </v-tab>
                <v-tab
                    value="settings"
                >
                    {{ $t('settings.title') }}
                </v-tab>
            </v-tabs>
        </template>
        <v-btn icon title="Stop VLC Playback" @click="stopVlc()">
            <v-icon icon="mdi-stop" />
        </v-btn>
        <v-btn icon title="Play in VLC" @click="playInVlc()">
            <v-icon icon="mdi-play" />
        </v-btn>
    </v-app-bar>
    <v-overlay v-model="showLoading" class="align-center justify-center">
        <div class="d-flex flex-column align-center justify-center">
            <v-progress-circular
                color="white"
                indeterminate
            ></v-progress-circular>
            <div class="text-white">{{ loadingText }}</div>
        </div>
    </v-overlay>
    <router-view />
</v-layout>
`;

const { ref, watch } = Vue;
const { useRouter } = VueRouter;
const { useI18n } = VueI18n;

const MainComponent = {
    template,
    setup() {
        const { t } = useI18n();
        const router = useRouter();
        const playlistStore = usePlaylistStore();

        const tab = ref(router.currentRoute.value.name ?? 'media');
        const showLoading = ref(false);
        const loadingText = ref(t('app.loading'));

        watch(() => tab.value, (tabName) => {
            router.push('/main/' + tabName);
            window.scrollTo(0, 0);
        });

        async function stopVlc() {
            loadingText.value = t('vlc.loading.exit');
            showLoading.value = true;
            try {
                await backend.vlc.exit();
            } catch (error) {}
            showLoading.value = false;
        }

        async function playInVlc() {
            loadingText.value = t('vlc.loading.buildPlaylist');
            showLoading.value = true;
            try {
                if (!playlistStore.isBuildCompleted) {
                    await backend.playlist.build();
                }
                await backend.playlist.next();
            } catch (error) {}
            showLoading.value = false;
        }

        return { tab, showLoading, loadingText, stopVlc, playInVlc };
    }
};

export default MainComponent;
