const childProcess = require('node:child_process');

function sh(
    cmd,
    opts
) {
    const executable = Array.isArray(cmd) ? cmd.join(';') : cmd;
    const options = {
        ...opts,
        stdio: 'pipe',
        cwd: process.cwd(),
    };
    
    const { platform } = process;
    
    try {
        const cmd = platform === 'win32' ? 'cmd' : 'sh';
        const arg = platform === 'win32' ? '/C' : '-c';
        const child = childProcess.spawn(cmd, [arg, executable], options);
        
        return new Promise((resolve) => {
            const stdoutList = [];
            const stderrList = [];
            
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    if (Buffer.isBuffer(data)) return stdoutList.push(data.toString());
                    stdoutList.push(data);
                });
            }
            
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    if (Buffer.isBuffer(data)) return stderrList.push(data.toString());
                    stderrList.push(JSON.stringify(data));
                });
            }
            
            const getDefaultResult = () => {
                const stderr = stderrList.join('\n');
                const stdout = stdoutList.join('\n');
                return { stdout, stderr, cmd: executable };
            };
            
            child.on('error', (error) => resolve({ ...getDefaultResult(), error }));
            child.on('close', (code) => resolve({ ...getDefaultResult(), code }));
        });
    } catch (error) {
        return Promise.reject(error);
    }
}

function killPort(port, method = 'tcp', signal = 'SIGTERM') {
    port = Number.parseInt(port)
    signal = {
        SIGHUP: 1,
        SIGINT: 2,
        SIGQUIT: 3,
        SIGABRT: 6,
        SIGKILL: 9,
        SIGTERM: 15
    }[signal];
    
    if (!port) {
        return Promise.reject(new Error('Invalid port number provided'))
    }
    
    if (!signal) {
        return Promise.reject(new Error('Invalid signal name provided'))
    }
    
    if (process.platform === 'win32') {
        return sh('netstat -nao')
        .then(res => {
            const { stdout } = res
            if (!stdout) return res
            
            const lines = stdout.split('\n')
            // The second white-space delimited column of netstat output is the local port,
            // which is the only port we care about.
            // The regex here will match only the local port column of the output
            const lineWithLocalPortRegEx = new RegExp(`^ *${method.toUpperCase()} *[^ ]*:${port}`, 'gm')
            const linesWithLocalPort = lines.filter(line => line.match(lineWithLocalPortRegEx))
            
            const pids = linesWithLocalPort.reduce((acc, line) => {
                const match = line.match(/(\d*)\w*(\n|$)/gm)
                return match && match[0] && !acc.includes(match[0]) ? acc.concat(match[0]) : acc
            }, [])
            
            return sh(`TaskKill /F /PID ${pids.join(' /PID ')}`)
        })
    }
    
    return sh('lsof -i -P')
    .then(res => {
        const { stdout } = res
        if (!stdout) return res
        const lines = stdout.split('\n')
        const existProccess = lines.filter((line) => line.match(new RegExp(`:*${port}`))).length > 0
        if (!existProccess) return Promise.reject(new Error('No process running on port'))
        
        return sh(
            `lsof -i ${method === 'udp' ? 'udp' : 'tcp'}:${port} | grep ${method === 'udp' ? 'UDP' : 'LISTEN'} | awk '{print $2}' | xargs kill -${signal}`
        );
    });
}
    
module.exports = {
    killPort
};
