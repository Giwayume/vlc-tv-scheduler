const { emitter } = require('./api/emitter');
require('./api/filesystem');
require('./api/playlist');
require('./api/store');
require('./api/vlc');

module.exports = {
    emitter,
};
