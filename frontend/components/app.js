import { useConfigurationStore } from '../store/configuration.js';

const template = `
<router-view />
`;

const AppComponent = {
    template,
    setup() {
        const configurationStore = useConfigurationStore();
        configurationStore.initialize();
    }
};

export default AppComponent;
