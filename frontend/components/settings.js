import { useVlcStore } from '../store/vlc.js';

const template = `
<v-main>
    <v-container>
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

    </v-container>
</v-main>
`;

const { onMounted, reactive } = Vue;

const SettingsComponent = {
    template,
    setup() {
        const vlcStore = useVlcStore();

        let vlcConfigUpdateTimeoutHandle = null;

        const vlcConfig = reactive({
            path: '',
            host: '',
            port: '',
            password: '',
            extraintf: '',
        });

        onMounted(() => {
            vlcConfig.path = vlcStore.path;
            vlcConfig.host = vlcStore.host;
            vlcConfig.port = vlcStore.port;
            vlcConfig.password = vlcStore.password;
            vlcConfig.extraintf = vlcStore.extraintf;
        });

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

        return {
            vlcConfig,
            queueVlcConfigUpdate,
        };
    }
};

export default SettingsComponent;
