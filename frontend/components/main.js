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
            </v-tabs>
        </template>
        <v-btn icon title="Play in VLC" @click="playInVlc()">
            <v-icon icon="mdi-play" />
        </v-btn>
    </v-app-bar>
    <router-view />
</v-layout>
`;

const { ref } = Vue;

const MainComponent = {
    template,
    setup() {
        const tab = ref('media');

        async function playInVlc() {
            await backend.playlist.build();
            await backend.playlist.next();
        }

        return { tab, playInVlc };
    }
};

export default MainComponent;
