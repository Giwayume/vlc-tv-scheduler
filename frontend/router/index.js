import routes from './routes.js';

const { createRouter, createWebHashHistory } = VueRouter;

const router = createRouter({
    routes,
    history: createWebHashHistory(),
});

export default router;
