'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const venom = require('venom-bot');
const axios = require('axios');
const mime = require('mime-types');
const { json } = require('express');

module.exports = class Sessions {

    static async start(sessionName, options = []) {
        Sessions.options = Sessions.options ||  options;
        Sessions.sessions = Sessions.sessions || [];

        var session = Sessions.getSession(sessionName);

        if(session == false ) {
            // Cria nova Sessao
            console.log('session == false');
            session = await Sessions.addSession(sessionName);
        } else if(['CLOSED'].includes(session.state)) {
            // Restarta a Sessao
            console.log('session.state == CLOSED');
            session.state = 'STARTING';
            session.status = 'notLogged';
            session.client = Sessions.initSession(sessionName);
            Sessions.setup(sessionName);
        } else if(['CONFLICT', 'UNPAIRED', 'UNLAUNCHED'].includes(session.state)) {
            console.log('client.useHere()');
            session.client.then(client => {
                client.useHere();
            });
        } else {
            console.log('session.state: ' + session.state);
        }

        return session;
    }

    static async addSession(sessionName) {
        var newSession = {
            name: sessionName,
            qrcode: false,
            client: false,
            status: 'notLogged',
            state: 'STARTING'
        }

        Sessions.sessions.push(newSession);
        console.log('newSession.state: ' + newSession.state);

        // cria sessao
        newSession.client = Sessions.initSession(sessionName);
        Sessions.setup(sessionName);

        return newSession;
    }

    static  async initSession(sessionName) {
        var session = Sessions.getSession(sessionName);
        session.browserSessionToken = null;

        const client = await venom.create(
            sessionName,
            (base64Qr, asciiQR, attempts) => {
                // session.state = "QRCODE";
                session.qrcode = base64Qr;
                console.log('Numero de tentativas de ler qrcode: ', attempts);
                console.log('Terminal qrcode: ', asciiQR);
            },
            // busca o status da sessao
            (statusSession, session)  => {
                console.log('#### status=' + statusSession + ' sessionName=' + session);
            }, {
                headless: true,
                devtools: false,
                useChrome: false,
                debug: false,
                logQR: false,
                browserArgs:  [
                    '--log-level=3',
                    '--no-default-browser-check',
                    '--disable-site-isolation-trials',
                    '--no-experiments',
                    '--ignore-gpu-blacklist',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--enable-features=NetworkService',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    // Extras
                    '--disable-webgl',
                    '--disable-threaded-animation',
                    '--disable-threaded-scrolling',
                    '--disable-in-process-stack-traces',
                    '--disable-histogram-customizer',
                    '--disable-gl-extensions',
                    '--disable-composited-antialiasing',
                    '--disable-canvas-aa',
                    '--disable-3d-apis',
                    '--disable-accelerated-2d-canvas',
                    '--disable-accelerated-jpeg-decoding',
                    '--disable-accelerated-mjpeg-decode',
                    '--disable-app-list-dismiss-on-bblur',
                    '--disable-accelerated-video-decode',
                ],
                refreshQR: 15000,
                autoClose: 60 * 60 * 24 * 365, //nunca
                disableSpins: true
            },
            session.browserSessionToken
        );

        var browserSessionToken = await client.getSessionTokenBrowser();
        console.log('usou isso no create: ' +  JSON.stringify(session.browserSessionToken));
        session.state = 'CONNECTED';
        return client;
    }

    static async setup(sessionName) {
        var session = Sessions.getSession(sessionName);
        await session.client.then(client => {
            client.onStateChange(state => {
                session.state = state;
                console.log('session.state: ' + state);
            });
            client.onMessage((message) => {
                if(message.body === 'hi') {
                    client.sendText(message.from, 'Hello\nfriend!');
                }
            });
        });
    }

    static async closeSession(sessionName) {
       var session = Sessions.getSession(sessionName) ;
       // so adiciona se nao existir
       if(session) {
           if(session.state != 'CLOSED') {
               if(session.client)
                await session.client.then(async client => {
                    try {
                        await client.close();
                    } catch(error) {
                        console.log('client.close(): ' + error.message);
                    }
                    session.state = 'CLOSED';
                    session.client = false;
                    console.log('client.close - session.state: ' + session.state);
                });
                return { result: "success", message: "CLOSED" };
           } else {
               return { result: "success", message: session.state };
           }
       } else {
           return { result: "error", message: "NOTFOUND" };
       }
    }

    static getSession(sessionName) {
        var foundSession = false;
        if(Sessions.sessions)
            Sessions.sessions.forEach(session => {
                if (sessionName == session.name) {
                    foundSession = session;
                }
            });
        return foundSession;
    }

    static getSessions() {
        if(Sessions.sessions) {
            return Sessions.sessions;
        } else {
            return [];
        }
    }

    static async getQrcode(sessionName) {
        var session = Sessions.getSession(sessionName);
        if(session) {
            if(['UNPAIRED_IDLE'].includes(session.state)) {
                // restart sessao
                await Sessions.closeSession(sessionName);
                Sessions.start(sessionName);
                return { result: "error", message: session.state };                
            } else if(['CLOSED'].includes(session.state)) {
                session.start(sessionName);
                return { result: "error", message: session.state };
            } else {
                // conectado
                if(session.status != 'isLogged') {
                    return { result: "success", message: session.state, qrcode: session.qrcode };
                } else {
                    return { result: "success", message: session.state };
                }
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    }

    static async sendText(req) {
        var params = {
            sessionName: req.body.sessionName,
            number: req.body.number,
            text: req.body.text
        }

        var session = Sessions.getSession(params.sessionName);
        if(session) {
            console.log(session.state);
            if(session.state == 'CONNECTED') {
                await session.client.then(async client => {                    
                    console.log('#### send msg = ', params);
                    return await client.sendText(params.number + '@c.us', params.text);
                });
                return { result: "success" };
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    }

    static async sendFile(sessionName, number, base64Data, fileName) {
        var session = Sessions.getSession(sessionName); 
        if (session) {
            if (session.state == 'CONNECTED') {
                var resultSendFile = await session.client.then(async (client) => {
                    var folderName = fs.mkdtempSync(path.join(os.tmpdir(), session.name + '-'));
                    var filePath = path.join(folderName, fileName);
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    console.log(filePath);
                    return await client.sendFile(number + '@c.us', filePath, fileName);
                }); 
                return { result: "success" };
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } 
}