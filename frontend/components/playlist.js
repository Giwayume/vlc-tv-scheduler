import { usePlaylistStore } from '../store/playlist.js';
import emitter from '../lib/emitter.js';

const template = `
<v-main>
    <v-container>
        <template v-if="isBuildCompleted">
            <div class="d-flex">
                <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" class="mr-2" @click="buildPlaylist()">
                    {{ $t('playlist.rebuildPlaylistAction') }}
                </v-btn>
                <v-btn variant="outlined" color="primary" prepend-icon="mdi-skip-next" class="mr-2" @click="playNext()">
                    {{ $t('playlist.playNextAction') }}
                </v-btn>
                <v-menu
                    v-model="isJumpMenuShown"
                    :close-on-content-click="false"
                    location="end"
                >
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" variant="outlined" color="primary" prepend-icon="mdi-skip-forward">
                            {{ $t('playlist.playJumpAction') }}
                        </v-btn>
                    </template>
                    <v-card>
                        <v-text-field
                            type="number"
                            step="1"
                            min="1"
                            v-model.number="jumpCount"
                            hide-details="auto"
                            :label="$t('playlist.jumpCountLabel')"
                        />
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn
                                variant="text"
                                @click="isJumpMenuShown = false"
                            >
                                {{ $t('playlist.playJumpCancel') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="text"
                                @click="jumpForward()"
                            >
                            {{ $t('playlist.playJumpConfirm') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-menu>
            </div>
            <v-divider class="my-4" />
            <v-card :elevation="4">
                <v-data-table-server
                    v-model:items-per-page="tableItemsPerPage"
                    v-model:page="tablePage"
                    :headers="tableHeaders"
                    :loading="tableLoading"
                    :items="tablePageItems"
                    :items-length="totalTableItems"
                    class="app-playlist-table"
                    @update:options="loadTableItems"
                ></v-data-table-server>
            </v-card>
        </template>
        <template v-else>
            <v-alert
                border="top"
                type="warning"
                variant="outlined"
                prominent
            >
                {{ $t('playlist.buildRequired') }}
                <v-btn density="compact" variant="outlined" class="ml-3" @click="buildPlaylist()">{{ $t('playlist.buildPlaylistAction') }}</v-btn>
            </v-alert>
        </template>
        <v-overlay v-model="showLoading" class="align-center justify-center">
            <div class="d-flex flex-column align-center justify-center">
                <v-progress-circular
                    color="white"
                    indeterminate
                ></v-progress-circular>
                <div class="text-white">{{ loadingText }}</div>
            </div>
        </v-overlay>
    </v-container>
</v-main>
`;

const { computed, nextTick, onMounted, ref, watch } = Vue;
const { useI18n } = VueI18n;

const PlaylistComponent = {
    template,
    setup() {
        const { t } = useI18n();
        const playlistStore = usePlaylistStore();

        const showLoading = ref(false);
        const loadingText = ref(t('app.loading'));
        const playlistCount = ref(5);

        let playlistItems = [];
        const tableItems = ref([]);
        const tablePageItems = ref([]);
        const tablePage = ref(1);
        const tableItemsPerPage = ref(5);
        const totalTableItems = ref(1000);
        const tableLoading = ref(false);

        const isJumpMenuShown = ref(false);
        const jumpCount = ref(1);

        const tableHeaders = [
            {
                align: 'start',
                key: 'filename',
                sortable: false,
                title: t('playlist.tableHeader.filename'),
            },
            {
                key: 'startTime',
                title: t('playlist.tableHeader.startTime'),
            },
        ];

        const isBuildCompleted = computed(() => playlistStore.isBuildCompleted);

        watch(() => isBuildCompleted.value, () => {
            tablePage.value = 1;
            playlistCount.value = tableItemsPerPage.value;
            loadTableItems({
                page: tablePage.value,
                itemsPerPage: tableItemsPerPage.value,
            });
        });

        emitter.on('playlist/nextMediaStarted', () => {
            tablePage.value = 1;
            playlistCount.value = tableItemsPerPage.value;
            tableItems.value = [];
            loadTableItems({
                page: tablePage.value,
                itemsPerPage: tableItemsPerPage.value,
            });
        });

        onMounted(() => {
            loadTableItems({
                page: tablePage.value,
                itemsPerPage: tableItemsPerPage.value,
            });
        });

        async function loadTableItems({ page, itemsPerPage }) {
            tableLoading.value = true;
            try {
                const itemCount = page * itemsPerPage;
                if (itemCount > tableItems.value.length) {
                    playlistCount.value = itemCount;
                    await queryPlaylist();
                    await nextTick();
                }
                await generateTableItemsFromPlaylist();
                const sliceStart = (page - 1) * itemsPerPage;
                tablePageItems.value = tableItems.value.slice(sliceStart, sliceStart + itemsPerPage);
                totalTableItems.value = 1000;
            } catch (error) {}
            tableLoading.value = false;
        }

        async function queryPlaylist() {
            if (!isBuildCompleted.value) return;
            playlistItems = await backend.playlist.query(playlistCount.value);
        }

        async function generateTableItemsFromPlaylist() {
            const remainingPlayTime = await playlistStore.queryRemainingPlayTime();
            let startTimestamp = new Date().getTime() + (remainingPlayTime * 1000);
            tableItems.value = playlistItems.map(item => {
                const newItem = {
                    filename: item.file,
                    startTime: new Date(startTimestamp).toLocaleTimeString(),
                };
                startTimestamp += (item.duration * 1000);
                return newItem;
            });
        }

        async function buildPlaylist() {
            playlistStore.setIsBuildCompleted(false);
            loadingText.value = t('vlc.loading.buildPlaylist');
            showLoading.value = true;
            try {
                await backend.playlist.build();
                tablePage.value = 1;
                playlistCount.value = tableItemsPerPage.value;
                tableItems.value = [];
                await loadTableItems({
                    page: tablePage.value,
                    itemsPerPage: tableItemsPerPage.value,
                });
            } catch (error) {}
            showLoading.value = false;
        }

        async function playNext() {
            await backend.playlist.next();
        }

        async function jumpForward() {
            loadingText.value = t('app.loading');
            showLoading.value = true;
            try {
                await backend.playlist.jump(parseInt(jumpCount.value));
            } catch (error) {}
            showLoading.value = false;
            isJumpMenuShown.value = false;
        }

        return {
            isBuildCompleted, showLoading, loadingText,
            tablePage, tableHeaders, tablePageItems, tableItemsPerPage, totalTableItems, tableLoading,
            isJumpMenuShown, jumpCount,
            loadTableItems, buildPlaylist, playNext, jumpForward,
        };
    }
};

export default PlaylistComponent;
