import { useConfigurationStore } from '../store/configuration.js';
import { usePlaylistStore } from '../store/playlist.js';
import { useVlcStore } from '../store/vlc.js';

const template = `
<v-main>
    <v-container class="pb-10">
        <h2 class="text-h4 mt-2 mb-3">{{ $t('settings.vlcHeading') }}</h2>
        <v-text-field
            v-model="vlcConfig.path"
            :label="$t('settings.vlcExePath')"
            @update:modelValue="queueVlcConfigUpdate()"
        />
        <v-row>
            <v-col
                cols="12"
                sm="4"
            >
                <v-text-field
                    v-model="vlcConfig.host"
                    :label="$t('settings.vlcRemoteHost')"
                    hide-details="auto"
                    @update:modelValue="queueVlcConfigUpdate()"
                />
            </v-col>
            <v-col
                cols="12"
                sm="4"
            >
                <v-text-field
                    v-model="vlcConfig.port"
                    :label="$t('settings.vlcRemotePort')"
                    hide-details="auto"
                    @update:modelValue="queueVlcConfigUpdate()"
                />
            </v-col>
            <v-col
                cols="12"
                sm="4"
            >
                <v-text-field
                    v-model="vlcConfig.password"
                    :label="$t('settings.vlcRemotePassword')"
                    hide-details="auto"
                    @update:modelValue="queueVlcConfigUpdate()"
                />
            </v-col>
            <v-col
                cols="12"
                sm="4"
            >
                <v-text-field
                    v-model="vlcConfig.extraintf"
                    :label="$t('settings.vlcRemoteExtraintf')"
                    hide-details="auto"
                    @update:modelValue="queueVlcConfigUpdate()"
                />
            </v-col>
        </v-row>

        <h2 class="text-h4 mt-10 mb-3">{{ $t('settings.mediaHeading') }}</h2>
        <v-combobox
            v-model="acceptedFileExtensions"
            :items="suggestedFileExtensions"
            :label="$t('settings.acceptedFileExtensionsLabel')"
            chips
            multiple
            hide-details="auto"
            @update:modelValue="queueAcceptedFileExtensionsUpdate()"
        />

        <h2 class="text-h4 mt-10 mb-3">{{ $t('settings.playlistHeading') }}</h2>
        <v-checkbox
            v-model="playlistConfig.randomizeTvList"
            :label="$t('settings.randomizeTvListLabel')"
            hide-details="auto"
            @update:modelValue="queuePlaylistConfigUpdate()"
        />
        <v-checkbox
            v-model="playlistConfig.randomizeTvSeriesStartOffset"
            :label="$t('settings.randomizeTvSeriesPlayOffsetLabel')"
            hide-details="auto"
            @update:modelValue="queuePlaylistConfigUpdate()"
        />
        <v-checkbox
            v-model="playlistConfig.enableTimebox"
            :label="$t('settings.enableTimeboxLabel')"
            hide-details="auto"
            @update:modelValue="queuePlaylistConfigUpdate()"
        />
        <div v-if="playlistConfig.enableTimebox" class="pl-10">
            <v-row>
                <v-col
                    cols="12"
                    sm="6"
                >
                    <v-text-field
                        v-model.number="playlistConfig.timeboxIntervalSeconds"
                        type="number"
                        step="1"
                        min="1"
                        :label="$t('settings.timeboxIntervalLabel')"
                        hide-details="auto"
                        @update:modelValue="queuePlaylistConfigUpdate()"
                    />
                </v-col>
            </v-row>
        </div>

        <h2 class="text-h4 mt-10 mb-3">{{ $t('settings.configHeading') }}</h2>
        <v-btn color="primary" variant="outlined" @click="openConfigFolder()">
            {{ $t('settings.openConfigFolder') }}
        </v-btn>
    </v-container>
</v-main>
`;

const { onMounted, reactive, ref } = Vue;

const SettingsComponent = {
    template,
    setup() {
        const configurationStore = useConfigurationStore();
        const playlistStore = usePlaylistStore();
        const vlcStore = useVlcStore();

        let acceptedFileExtensionsUpdateTimeoutHandle = null;
        let vlcConfigUpdateTimeoutHandle = null;
        let playlistConfigUpdateTimeoutHandle = null;

        const acceptedFileExtensions = ref([]);
        const suggestedFileExtensions = ref([
            '3gp', 'a52', 'aac', 'asf', 'au', 'avi', 'dts', 'dv',
            'flac', 'flv', 'mka', 'mkv', 'mov', 'mp2', 'mp3', 'mp4', 'mpg',
            'nsc', 'nsv', 'nut', 'ogg', 'ogm', 'ra', 'ram', 'rm', 'rmbv', 'rv',
            'tac', 'ts', 'tta', 'ty', 'vid', 'wav', 'wmv', 'xa',
        ]);

        const playlistConfig = reactive({
            randomizeTvList: false,
            randomizeTvSeriesStartOffset: false,
            enableTimebox: false,
            timeboxIntervalSeconds: 900,
        });

        const vlcConfig = reactive({
            path: '',
            host: '',
            port: '',
            password: '',
            extraintf: '',
        });

        onMounted(() => {
            acceptedFileExtensions.value = configurationStore.acceptedFileExtensions;
            playlistConfig.randomizeTvList = playlistStore.randomizeTvList;
            playlistConfig.randomizeTvSeriesStartOffset = playlistStore.randomizeTvSeriesStartOffset;
            playlistConfig.enableTimebox = playlistStore.enableTimebox;
            playlistConfig.timeboxIntervalSeconds = playlistStore.timeboxIntervalSeconds;
            vlcConfig.path = vlcStore.path;
            vlcConfig.host = vlcStore.host;
            vlcConfig.port = vlcStore.port;
            vlcConfig.password = vlcStore.password;
            vlcConfig.extraintf = vlcStore.extraintf;
        });

        async function queueAcceptedFileExtensionsUpdate() {
            window.clearTimeout(acceptedFileExtensionsUpdateTimeoutHandle);
            acceptedFileExtensionsUpdateTimeoutHandle = window.setTimeout(() => {
                acceptedFileExtensionsUpdate();
            }, 2000);
        }

        async function acceptedFileExtensionsUpdate() {
            window.clearTimeout(acceptedFileExtensionsUpdateTimeoutHandle);
            playlistStore.setIsBuildCompleted(false);
            configurationStore.setAcceptedFileExtensions(acceptedFileExtensions.value);
        }

        async function queueVlcConfigUpdate() {
            window.clearTimeout(vlcConfigUpdateTimeoutHandle);
            vlcConfigUpdateTimeoutHandle = window.setTimeout(() => {
                vlcConfigUpdate();
            }, 2000);
        }

        async function vlcConfigUpdate() {
            window.clearTimeout(vlcConfigUpdateTimeoutHandle);
            vlcStore.setPath(vlcConfig.path);
            vlcStore.setHost(vlcConfig.host);
            vlcStore.setPort(parseInt(vlcConfig.port));
            vlcStore.setPassword(vlcConfig.password);
            vlcStore.setExtraintf(vlcConfig.extraintf);
        }

        async function queuePlaylistConfigUpdate() {
            window.clearTimeout(playlistConfigUpdateTimeoutHandle);
            playlistConfigUpdateTimeoutHandle = window.setTimeout(() => {
                playlistConfigUpdate();
            }, 2000);
        }

        async function playlistConfigUpdate() {
            window.clearTimeout(playlistConfigUpdateTimeoutHandle);
            playlistStore.setIsBuildCompleted(false);
            playlistStore.setRandomizeTvList(playlistConfig.randomizeTvList);
            playlistStore.setRandomizeTvSeriesStartOffset(playlistConfig.randomizeTvSeriesStartOffset);
            playlistStore.setEnableTimebox(playlistConfig.enableTimebox);
            playlistStore.setTimeboxIntervalSeconds(playlistConfig.timeboxIntervalSeconds);
        }

        async function openConfigFolder() {
            backend.filesystem.openUserDataFolder();
        }

        return {
            acceptedFileExtensions,
            suggestedFileExtensions,
            playlistConfig,
            vlcConfig,
            queueAcceptedFileExtensionsUpdate,
            queueVlcConfigUpdate,
            queuePlaylistConfigUpdate,
            openConfigFolder,
        };
    }
};

export default SettingsComponent;
