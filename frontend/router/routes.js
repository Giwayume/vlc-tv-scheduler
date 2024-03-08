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
            }
        ],
    },
];

export default routes;
