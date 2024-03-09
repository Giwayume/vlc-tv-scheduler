import { useConfigurationStore } from '../store/configuration.js';
import { usePlaylistStore } from '../store/playlist.js';
import { uuidv4 } from '../lib/uuid.js';

const template = `
<v-main>
    <v-container>
        <h2 class="text-h4 mt-2 mb-2">{{ $t('media.tvHeading') }}</h2>

        <v-alert color="blue-darken-2" variant="tonal" border="start" class="mb-4">
            <div v-html="$t('media.instructions')" />
        </v-alert>
        <template v-if="tvSeriesList.length > 0">
            <v-expansion-panels class="app-emphasized-open-expansion-panels mb-5">
                <v-expansion-panel
                    v-for="(media, mediaIndex) of tvSeriesList"
                    :key="media.uuid"
                >
                    <v-expansion-panel-title>
                        <v-icon icon="mdi-folder" class="mr-2" />
                        {{ media.folder }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <h3 class="text-h6 mb-2 mt-1" v-t="'media.mixingHeading'" />
                        <v-row>
                            <v-col
                                cols="12"
                                sm="4"
                            >
                                <v-text-field
                                    type="number"
                                    step="1"
                                    min="1"
                                    v-model.number="media.playCount"
                                    hide-details="auto"
                                    :label="$t('media.playCountLabel')"
                                    @update:modelValue="queueTvListUpdate()"
                                />
                            </v-col>
                            <v-col
                                cols="12"
                                sm="4"
                            >
                                <v-select
                                    v-model="media.playOrder"
                                    :label="$t('media.playOrderLabel')"
                                    :items="playOrderOptions"
                                    @update:modelValue="queueTvListUpdate()"
                                />
                            </v-col>
                            <v-col
                                cols="12"
                                sm="4"
                            >
                                <v-text-field
                                    type="number"
                                    step="1"
                                    v-model.number="media.playlistOffset"
                                    hide-details="auto"
                                    :label="$t('media.playlistOffsetLabel')"
                                    @update:modelValue="queueTvListUpdate()"
                                />
                            </v-col>
                        </v-row>

                        <v-divider />

                        <h3 class="text-h6 mb-2 mt-4" v-t="'media.scheduleHeading'" />
                        <p class="mb-2 mt-3" v-t="'media.cronLabel'" />
                        <v-sheet
                            color="grey-lighten-3"
                            rounded="lg"
                            class="px-4 py-2"
                        >
                            <cron-vuetify v-model="media.cron" class="vcron-v" @update:modelValue="queueTvListUpdate()"></cron-vuetify>
                        </v-sheet>

                        <v-row class="mt-1">
                            <v-col
                                cols="12"
                                sm="4"
                            >
                                <v-select
                                    v-model="media.playTimeType"
                                    :label="$t('media.playTimeTypeLabel')"
                                    :items="playTimeTypeOptions"
                                    @update:modelValue="queueTvListUpdate()"
                                />
                            </v-col>
                            <v-col
                                v-if="media.playTimeType === 'exactLength'"
                                cols="12"
                                sm="4"
                            >
                                <v-text-field
                                    type="number"
                                    step="1"
                                    min="1"
                                    v-model.number="media.playTime"
                                    hide-details="auto"
                                    :label="$t('media.playTimeLabel')"
                                    @update:modelValue="queueTvListUpdate()"
                                />
                            </v-col>
                        </v-row>

                        <v-divider />

                        <h3 class="text-h6 mb-2 mt-4" v-t="'media.actionsHeading'" />
                        <v-btn v-if="mediaIndex > 0" color="primary" variant="outlined" prepend-icon="mdi-arrow-up-circle" class="mr-2" @click="reorderBefore(mediaIndex)">
                            {{ $t('media.reorderBefore') }}
                        </v-btn>
                        <v-btn v-if="mediaIndex < tvSeriesList.length" color="primary" variant="outlined" prepend-icon="mdi-arrow-down-circle" class="mr-2" @click="reorderAfter(mediaIndex)">
                            {{ $t('media.reorderAfter') }}
                        </v-btn>
                        <v-btn color="primary" variant="outlined" prepend-icon="mdi-folder" class="mr-2" @click="openTvSeriesFolder(media)">
                            {{ $t('media.openFolder') }}
                        </v-btn>
                        <v-btn color="error" variant="outlined" prepend-icon="mdi-delete" @click="removeTvSeries(media)">
                            {{ $t('media.removeFolder') }}
                        </v-btn>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>
        </template>
        <v-btn color="primary" prepend-icon="mdi-plus-circle" @click="addTvSeries()">
            {{ $t('media.addNewFolder') }}
        </v-btn>
    </v-container>
</v-main>
<v-dialog v-model="showDeleteConfirm" max-width="500">
    <v-card :title="$t('media.removeFolderConfirm.title')">
        <v-card-text>
            {{ $t('media.removeFolderConfirm.description') }}
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                :text="$t('media.removeFolderConfirm.cancel')"
                @click="showDeleteConfirm = false"
            ></v-btn>
            <v-btn
                :text="$t('media.removeFolderConfirm.remove')"
                color="error"
                @click="removeTvSeriesConfirm()"
            ></v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
`;

const { ref, watch } = Vue;
const { useI18n } = VueI18n;

const MediaComponent = {
    template,
    setup() {
        const { t } = useI18n();
        const configurationStore = useConfigurationStore();
        const playlistStore = usePlaylistStore();

        const tvSeriesList = ref([]);
        const showDeleteConfirm = ref(false);
        let tvSeriesRemoveIndex = 0;
        let tvListUpdateTimeoutHandle = null;

        watch(() => configurationStore.tvSeriesList, (newTvSeriesList) => {
            tvSeriesList.value = newTvSeriesList;
        }, { immediate: true });

        const playOrderOptions = [
            { value: 'alphabetical', title: t('media.playOrderOptions.alphabetical') },
            { value: 'random', title: t('media.playOrderOptions.random') },
        ];

        const playTimeTypeOptions = [
            { value: 'videoLength', title: t('media.playTimeTypeOptions.videoLength') },
            { value: 'exactLength', title: t('media.playTimeTypeOptions.exactLength') },
        ];

        function queueTvListUpdate() {
            window.clearTimeout(tvListUpdateTimeoutHandle);
            tvListUpdateTimeoutHandle = window.setTimeout(() => {
                playlistStore.setIsBuildCompleted(false);
                configurationStore.setTvSeriesList(tvSeriesList.value);
            }, 2000);
        }

        async function addTvSeries() {
            const folders = await window.backend.filesystem.pickDirectories();
            for (const folder of folders) {
                tvSeriesList.value.push({
                    uuid: uuidv4(),
                    folder,
                    title: '',
                    playCount: 1,
                    playOrder: 'alphabetical',
                    playlistOffset: 0,
                    playTimeType: 'videoLength',
                    playTime: 0,
                    cron: '* * * * *',
                });
            }
            playlistStore.setIsBuildCompleted(false);
            configurationStore.setTvSeriesList(tvSeriesList.value);
        }

        async function reorderBefore(seriesIndex) {
            const [tvSeries] = tvSeriesList.value.splice(seriesIndex, 1);
            tvSeriesList.value.splice(seriesIndex - 1, 0, tvSeries);
            playlistStore.setIsBuildCompleted(false);
            configurationStore.setTvSeriesList(tvSeriesList.value);
        }

        async function reorderAfter(seriesIndex) {
            const [tvSeries] = tvSeriesList.value.splice(seriesIndex, 1);
            tvSeriesList.value.splice(seriesIndex + 1, 0, tvSeries);
            playlistStore.setIsBuildCompleted(false);
            configurationStore.setTvSeriesList(tvSeriesList.value);
        }

        async function openTvSeriesFolder(series) {
            backend.filesystem.openPath(series.folder);
        }

        async function removeTvSeries(series) {
            tvSeriesRemoveIndex = tvSeriesList.value.indexOf(series);
            showDeleteConfirm.value = true;
        }

        async function removeTvSeriesConfirm() {
            tvSeriesList.value.splice(tvSeriesRemoveIndex, 1);
            playlistStore.setIsBuildCompleted(false);
            configurationStore.setTvSeriesList(tvSeriesList.value);
            showDeleteConfirm.value = false;
        }

        return {
            tvSeriesList, playOrderOptions, playTimeTypeOptions, showDeleteConfirm,
            queueTvListUpdate, addTvSeries, openTvSeriesFolder,
            reorderBefore, reorderAfter, removeTvSeries, removeTvSeriesConfirm,
        };
    }
};

export default MediaComponent;
