const routes = [
    {
        path: '/',
        redirect: '/main',
    },
    {
        path: '/main',
        name: 'main',
        component: () => import('../components/main.js'),
        redirect: '/main/media',
        children: [
            {
                path: 'media',
                name: 'media',
                component: () => import('../components/media.js'),
            },
            {
                path: 'playlist',
                name: 'playlist',
                component: () => import('../components/playlist.js'),
            },
            {
                path: 'settings',
                name: 'settings',
                component: () => import('../components/settings.js'),
            },
        ],
    },
];

export default routes;
