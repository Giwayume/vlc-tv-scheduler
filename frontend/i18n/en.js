const en = {
    app: {
        title: 'VLC TV Scheduler',
        loading: 'Loading...',
    },
    vlc: {
        loading: {
            buildPlaylist: 'Building Playlist...',
            exit: 'Exiting VLC...',
        },
    },
    media: {
        title: 'Media',
        instructions: '<p>Select <strong>one or more folders</strong> containing the media you wish to play.</p><p>This application is designed so that <strong>each TV series should be in its own folder</strong>, and you should select each of those folders individually.</p>',
        mixingHeading: 'Mixing',
        tvHeading: 'TV Series List',
        playCount: 'Play Episode Count',
        playOrder: 'Play Order',
        scheduleHeading: 'Schedule',
        cronLabel: 'Media in this folder can play in this timeframe:',
        playTimeTypeLabel: 'Play Length',
        playTimeLabel: 'Specify Length in Seconds:',
        actionsHeading: 'Actions',
        removeFolder: 'Remove',
        removeFolderConfirm: {
            title: 'Are you sure?',
            description: 'This media folder will be removed from this app\'s configuration. The folder itself will NOT be deleted.',
            cancel: 'Cancel',
            remove: 'Remove Configuration',
        },
        addNewFolder: 'Select a folder containing 1 TV series...',
    },
    playlist: {
        title: 'Playlist',
        buildRequired: 'The playlist needs to be built.',
        buildPlaylistAction: 'Build Playlist',
        rebuildPlaylistAction: 'Rebuild Playlist',
        tableHeader: {
            filename: 'Filename',
            startTime: 'Start Time',
        },
    },
    settings: {
        title: 'Settings',
        vlcHeading: 'VLC',
        vlcExePath: 'VLC Executable Path',
        vlcRemoteHost: 'Remote Host',
        vlcRemotePort: 'Remote Port',
        vlcRemotePassword: 'Remote Password',
        vlcRemoteExtraintf: 'Remote Extraintf',
    },
};
export default en;