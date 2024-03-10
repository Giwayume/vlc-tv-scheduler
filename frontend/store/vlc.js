const { defineStore } = Pinia;

let updateBackendVlcConfigTimerHandle = null;

export const useVlcStore = defineStore('vlcStore', {
    state: () => {
        return {
            path: '',
            host: '127.0.0.1',
            port: 8080,
            password: 'vlcremote',
            extraintf: 'http,luaintf',
            options: [],
        };
    },
    actions: {
        async initialize() {
            this.path = (await backend.store.getVlcPath()) ?? '';
            const { host, port, password, extraintf } = await backend.store.getVlcConfig();
            this.host = host;
            this.port = port;
            this.password = password;
            this.extraintf = extraintf;
        },
        setPath(path) {
            this.path = path;
            backend.store.setVlcPath(path);
        },
        setHost(host) {
            this.host = host;
            this.queueUpdateBackendVlcConfig();
        },
        setPort(port) {
            this.port = port;
            this.queueUpdateBackendVlcConfig();
        },
        setPassword(password) {
            this.password = password;
            this.queueUpdateBackendVlcConfig();
        },
        setExtraintf(extraintf) {
            this.extraintf = extraintf;
            this.queueUpdateBackendVlcConfig();
        },
        queueUpdateBackendVlcConfig() {
            clearTimeout(updateBackendVlcConfigTimerHandle);
            updateBackendVlcConfigTimerHandle = setTimeout(() => {
                this.updateBackendVlcConfig();
            }, 1);
        },
        updateBackendVlcConfig() {
            backend.store.setVlcConfig({
                host: this.host,
                port: this.port,
                password: this.password,
                extraintf: this.extraintf,
                options: JSON.parse(JSON.stringify(this.options)),
            });
        }
    }
});
