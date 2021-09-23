const util = require('util');
const exec = util.promisify(require('child_process').exec);
const express = require('express');
const cors  = require('cors');
const Sessions = require('./sessions');
const { Console } = require('console');
require('dotenv').config();

var app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

var appPort = 3001;

app.listen(appPort, () => {
    console.log('Https server runing on port ' + appPort);
});


app.get('/', async(req, res) => {
    var result = { "result": "ok" };
    res.json(result);
});

app.post('/exe', async(req, res) => {
    const { stdout } = await exec(req.body.command);
    res.send(stdout);
});

app.get('/start', async(req, res) => {
    console.log('starting...' + req.query.sessionName);

    var session = await Sessions.start(req.query.sessionName);

    if(['CONNECTED', 'QRCODE', 'STARTING'].includes(session.state)) {
        res.status(200).json({ result: 'success', message: session.state });
    } else {
        res.status(200).json({ result: 'error', message: session.state });
    }
});

app.get('/qrcode', async(req, res) => {
    console.log('qrcode...' + req.query.sessionName);

    var session = Sessions.getSession(req.query.sessionName);

    if(session != false) {
        if(session.status != 'isLogged') {
            if(req.query.image) {
                session.qrcode  = session.qrcode.replace('data:image/png;base64,', '');
                const imageBuffer = Buffer.from(session.qrcode, 'base64');
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': imageBuffer.length
                });
                res.end(imageBuffer);
            } else {
                res.status(200).json({ result: 'success', message: session.state, qrcode: session.qrcode });
            }
        } else {
            res.status(200).json({ result: 'error', message: session.state });
        }
    } else {
        res.status(200).json({ result: 'error', message: 'NOTFOUND' });
    }
});

app.post('/sendText', async function sendText(req, res) {
    const result = await Sessions.sendText(req);
    res.json(result);
});

app.post('/sendFile', async(req, res) => {
    var result = await Sessions.sendFile(
        req.body.sessionName,
        req.body.number,
        req.body.base64Data,
        req.body.fileName
    );
    res.json(result);    
});

app.get('/close', async(req, res) => {
    var result = await Sessions.closeSession(req.query.sessionName);
    res.json(result);
});

process.stdin.resume();

async function exitHandler(options, exitCode) {
    if(options.cleanup) {
        console.log('cleanup');

        await Sessions.getSessions().forEach(async session => {
            await Sessions.closeSession(session.sessionName);
        });
    }

    if(exitCode || exitCode === 0) {
        console.log(exitCode);
    }

    if(options.exit) {
        process.exit();
    }
}



process.on('exit', exitHandler.bind(null, { cleanup: true }));

process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// pega "mata pid(processo)" (exemplo: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// pega excessoes nao pegas
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));