import ComponentsPlugin from './components/index.js';
import router from './router/index.js';
import i18n from './i18n/index.js';

const { createApp } = Vue;
const { createPinia } = Pinia;
const { createVuetify } = Vuetify;
const { CronVuetifyPlugin } = VueJsCronVuetify;

const app = createApp({
    template: '<app />'
});

const pinia = createPinia();
const vuetify = createVuetify();

app.use(i18n);
app.use(router);
app.use(pinia);
app.use(vuetify);
app.use(CronVuetifyPlugin);
app.use(ComponentsPlugin);

app.mount('#app');
