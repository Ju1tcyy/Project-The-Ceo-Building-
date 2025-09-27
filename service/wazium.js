require('dotenv').config()
require('../config.js')
const {
    proto,
    delay,
    generateWAMessage,
    areJidsSameUser,
    getContentType
} = require('@itsukichan/baileys')
const makeWASocket = require("@itsukichan/baileys").default
const { nocache } = require('../lib/loader.js')
const Table = require('cli-table3')
const { color } = require('../lib/color.js')
const chalk = require('chalk')
const figlet = require('figlet')
const NodeCache = require("node-cache")
const readline = require("readline")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, makeCacheableSignalKeyStore, PHONENUMBER_MCC } = require("@itsukichan/baileys")
const { extendBot } = require('../lib/functions.js') // Import bot extensions

let isShuttingDown = false; // Flag to indicate intentional shutdown

let initialConnectDisplayed = false; // Flag to ensure banner and initial spinner message appear only once.

const store = makeInMemoryStore({
    logger: pino().child({
        level: 'silent',
        stream: 'store'
    })
})

require('../lib/handler.js')
nocache('../lib/handler.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'))
require('../lib/functions.js')
nocache('../lib/functions.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'))
require('../commandHandler.js')
nocache('../commandHandler.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'))

const pairingCode = true // Set to true to enable pairing code login by default
const useMobile = process.argv.includes("--mobile")
const botNumber = process.env.BOTNUMBER || null;
const webhooks = process.env.WEBHOOKS ? process.env.WEBHOOKS.split(',').map(x => x.trim()).filter(Boolean) : [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startWaziumBot() {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()
    const WaziumBot = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode, // popping up QR in terminal log
        browser: ['Mac OS', 'chrome', '121.0.6167.159'], // for this issues https://github.com/WhiskeySockets/Baileys/issues/328
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true, // set false for offline
        generateHighQualityLinkPreview: true, // make high preview link
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg.message || undefined
            }
            return {
                conversation: "Cheems Bot Here!"
            }
        },
        msgRetryCounterCache, // Resolve waiting messages
        defaultQueryTimeoutMs: undefined, // for this issues https://github.com/WhiskeySockets/Baileys/issues/276
    })

    store.bind(WaziumBot.ev)

    if (pairingCode && !WaziumBot.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')
        let phoneNumber = botNumber;
        if (!!phoneNumber) {
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example : +916909137213")))
                process.exit(0)
            }
        } else {
            console.log(color(figlet.textSync('WaziumBot', {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default',
                width: 80,
                whitespaceBreak: true
            }), 'white'));
            console.log(color(` ======================================================>`, 'cyan'));
            phoneNumber = await question((chalk.greenBright(` Please type your WhatsApp number\n For example: +916909137213 : `)))
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            // Ask again when entering the wrong number
            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example : +916909137213")))

                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFor example: +916909137213 : `)))
                phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
                rl.close()
            }
        }

        setTimeout(async () => {
            let code = await WaziumBot.requestPairingCode(phoneNumber)
            code = code?.match(/.{1,4}/g)?.join("-") || code
            console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
        }, 3000)
    }

    WaziumBot.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect
        } = update
        try {
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output.statusCode
                if (isShuttingDown) {
                    console.log(color(" ✅ Intentional shutdown, not restarting WaziumBot.", 'green'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    process.exit(0); // Exit the child process gracefully
                } else if (reason === DisconnectReason.badSession) {
                    console.log(color(` ❌ Bad Session File, Please Delete Session and Scan Again`, 'red'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.connectionClosed) {
                    console.log(color(" ℹ️ Connection closed, reconnecting....", 'cyan'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log(color(" ⚠️ Connection Lost from Server, reconnecting...", 'yellow'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log(color(" ⚠️ Connection Replaced, Another New Session Opened, Please Close Current Session First", 'yellow'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.loggedOut) {
                    console.log(color(` ❌ Device Logged Out, Please Delete Session and Scan Again.`, 'red'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log(color(" 🔄 Restart Required, Restarting...", 'cyan'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else if (reason === DisconnectReason.timedOut) {
                    console.log(color(" ⏳ Connection TimedOut, Reconnecting...", 'yellow'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    startWaziumBot();
                } else WaziumBot.end(color(` ❌ Unknown DisconnectReason: ${reason}|${connection}`, 'red'));
                console.log(color(` ======================================================>`, 'cyan'));
            }

            if (update.connection == "connecting" || update.receivedPendingNotifications == "false") {
                if (!initialConnectDisplayed) { // Only show banner once per application run
                    console.log(color(figlet.textSync('WaziumBot', {
                        font: 'Standard',
                        horizontalLayout: 'default',
                        verticalLayout: 'default',
                        width: 80,
                        whitespaceBreak: true
                    }), 'white'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    console.log(color(` ${global.themeemoji}  GitHub      `, 'black'), color(`:${global.githubname}`, 'white'));
                    console.log(color(` ${global.themeemoji}  Instagram   `, 'pink'), color(`:${global.instaname}`, 'white'));
                    console.log(color(` ${global.themeemoji}  WhatsApp    `, 'green'), color(`:${global.ownernumber}`, 'white'));
                    console.log(color(` ${global.themeemoji}  Credit      `, 'yellow'), color(`:${global.wm}`, 'white'));
                    console.log(color(` ======================================================>`, 'cyan'));
                    initialConnectDisplayed = true; // Set flag to true after displaying banner

                }
                console.log(color(` ⏳ Wazium Connecting to WhatsApp!...`, 'yellow'));
                console.log(color(` ======================================================>`, 'cyan'));
            }
            if (update.connection == "open" || update.receivedPendingNotifications == "true") {
                console.log(color(` ✅ Wazium Connected!!!`, 'green'));
                console.log(color(` ======================================================>`, 'cyan'));
                console.log(color(` 👀 Ready to receive messages`, 'blue'));
                console.log(color(` ======================================================>`, 'cyan'));

            }
        } catch (err) {
            console.log('Error in Connection.update ' + err)
            startWaziumBot()
        }
    })
    WaziumBot.ev.on('creds.update', saveCreds)
    WaziumBot.ev.on("messages.upsert", () => { })

    WaziumBot.ev.on('messages.upsert', async chatUpdate => {
        try {
            mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            if (!WaziumBot.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('Xeon') && mek.key.id.length === 16) return
            if (mek.key.id.startsWith('BAE5')) return
            m = smsg(WaziumBot, mek, store)
            require("../lib/handler.js")(WaziumBot, m, chatUpdate, store)
            if (webhooks.length > 0) {
                try {
                    const axios = require('axios');
                    const payload = { event: 'messages.upsert', data: chatUpdate };
                    for (const url of webhooks) {
                        axios.post(url, payload).catch(e => console.error('Webhook error:', url, e.message));
                    }
                } catch (e) {
                    console.error('Gagal memanggil webhook:', e.message);
                }
            }
        } catch (err) {
            console.log(err)
        }
    })

    WaziumBot.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    WaziumBot.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = WaziumBot.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            }
        }
    })

    WaziumBot.getName = (jid, withoutContact = false) => {
        id = WaziumBot.decodeJid(jid)
        withoutContact = WaziumBot.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = WaziumBot.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === WaziumBot.decodeJid(WaziumBot.user.id) ?
            WaziumBot.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    WaziumBot.public = true

    WaziumBot.serializeM = (m) => smsg(WaziumBot, m, store)

    extendBot(WaziumBot)

    return WaziumBot
}

let waziumBotInstance = null;

// Express dan Swagger Setup
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for file uploads
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Definisi manual untuk Swagger spec
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Wazium WhatsApp API',
        version: '1.0.0',
        description: 'API untuk mengirim pesan WhatsApp secara dinamis menggunakan WaziumBot',
    },
    servers: [
        { url: 'http://localhost:3000' },
    ],
    paths: {
        '/send-message': {
            post: {
                summary: 'Mengirim pesan WhatsApp ke nomor tujuan',
                description: 'Kirim pesan WhatsApp dengan payload bebas (mengikuti format sendMessage Baileys)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['to', 'message'],
                                properties: {
                                    to: {
                                        type: 'string',
                                        description: 'JID WhatsApp tujuan (misal: 628xxxx@s.whatsapp.net)',
                                        example: '628123456789@s.whatsapp.net'
                                    },
                                    message: {
                                        type: 'object',
                                        description: 'Payload pesan sesuai format Baileys',
                                        examples: {
                                            'text-message': {
                                                summary: 'Pesan teks biasa',
                                                value: {
                                                    text: 'Halo dari API'
                                                }
                                            },
                                            'image-message': {
                                                summary: 'Pesan gambar dengan caption',
                                                value: {
                                                    image: { url: 'https://example.com/image.jpg' },
                                                    caption: 'Ini adalah gambar'
                                                }
                                            },
                                            'document-message': {
                                                summary: 'Pesan dokumen',
                                                value: {
                                                    document: { url: 'https://example.com/document.pdf' },
                                                    fileName: 'document.pdf',
                                                    mimetype: 'application/pdf'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Pesan berhasil dikirim',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: {
                                            type: 'boolean',
                                            example: true
                                        },
                                        message: {
                                            type: 'string',
                                            example: 'Pesan berhasil dikirim'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Parameter kurang atau tidak valid',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'string',
                                            example: 'Parameter "to" dan "message" wajib diisi'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '503': {
                        description: 'Bot belum siap',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'string',
                                            example: 'Bot belum siap'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '500': {
                        description: 'Error internal server',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'string',
                                            example: 'Internal server error'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/bot-status': {
            get: {
                summary: 'Mengecek status bot WhatsApp',
                description: 'Mendapatkan informasi status koneksi bot WhatsApp',
                responses: {
                    '200': {
                        description: 'Status bot berhasil diambil',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'connected'
                                        },
                                        ready: {
                                            type: 'boolean',
                                            example: true
                                        },
                                        user: {
                                            type: 'object',
                                            properties: {
                                                id: {
                                                    type: 'string',
                                                    example: '628123456789@s.whatsapp.net'
                                                },
                                                name: {
                                                    type: 'string',
                                                    example: 'WaziumBot'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/webhooks': {
            get: {
                summary: 'Mendapatkan daftar webhook aktif',
                description: 'Mendapatkan daftar webhook yang telah dikonfigurasi untuk menerima notifikasi dari WaziumBot.',
                responses: {
                    '200': {
                        description: 'Daftar webhook berhasil diambil',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

// Setup Swagger UI dengan definisi manual
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

// Route untuk mengirim pesan
app.post('/send-message', async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body, null, 2));
    
    if (!waziumBotInstance) {
        console.log('Bot instance not ready');
        return res.status(503).json({
            error: 'Bot belum siap',
            message: 'WhatsApp bot sedang dalam proses koneksi. Silakan tunggu beberapa saat.'
        });
    }

    const { to, message } = req.body;

    // Validasi input
    if (!to || !message) {
        console.log('Missing required parameters:', { to, message });
        return res.status(400).json({
            error: 'Parameter "to" dan "message" wajib diisi',
            example: {
                to: '628123456789@s.whatsapp.net',
                message: { text: 'Halo dari API' }
            }
        });
    }

    // Validasi format JID WhatsApp
    if (!to.includes('@s.whatsapp.net') && !to.includes('@g.us')) {
        console.log('Invalid JID format:', to);
        return res.status(400).json({
            error: 'Format nomor WhatsApp tidak valid',
            message: 'Gunakan format: 628123456789@s.whatsapp.net untuk chat pribadi atau groupid@g.us untuk grup'
        });
    }

    try {
        // Handle different message types
        let processedMessage = message;
        
        console.log('Processing message type:', Object.keys(message));
        
        // If message contains base64 data URL, convert it to buffer
        if (message.image && message.image.url && message.image.url.startsWith('data:')) {
            console.log('Processing image message');
            const base64Data = message.image.url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedMessage.image = buffer;
            delete processedMessage.image.url;
        }
        
        if (message.video && message.video.url && message.video.url.startsWith('data:')) {
            console.log('Processing video message');
            const base64Data = message.video.url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedMessage.video = buffer;
            delete processedMessage.video.url;
        }
        
        if (message.audio && message.audio.url && message.audio.url.startsWith('data:')) {
            console.log('Processing audio message');
            const base64Data = message.audio.url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedMessage.audio = buffer;
            delete processedMessage.audio.url;
        }
        
        if (message.document && message.document.url && message.document.url.startsWith('data:')) {
            console.log('Processing document message');
            const base64Data = message.document.url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedMessage.document = buffer;
            delete processedMessage.document.url;
        }

        console.log('Sending message to:', to);
        const result = await waziumBotInstance.sendMessage(to, processedMessage);
        console.log('Message sent successfully:', result.key.id);
        
        res.json({
            success: true,
            message: 'Pesan berhasil dikirim',
            messageId: result.key.id
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({
            error: 'Gagal mengirim pesan',
            details: err.message
        });
    }
});

// Route untuk mengecek status bot
app.get('/bot-status', (req, res) => {
    if (!waziumBotInstance) {
        return res.json({
            status: 'disconnected',
            ready: false,
            message: 'Bot sedang dalam proses startup'
        });
    }

    try {
        const user = waziumBotInstance.user;
        res.json({
            status: 'connected',
            ready: true,
            user: user ? {
                id: user.id,
                name: user.name || user.verifiedName || 'WaziumBot'
            } : null,
            message: 'Bot siap menerima perintah'
        });
    } catch (err) {
        res.json({
            status: 'error',
            ready: false,
            message: err.message
        });
    }
});

// Route untuk health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Route untuk API info (moved to /api/info)
app.get('/api/info', (req, res) => {
    res.json({
        message: 'Wazium WhatsApp API Server',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            'POST /send-message': 'Kirim pesan WhatsApp',
            'GET /bot-status': 'Status bot WhatsApp',
            'GET /health': 'Health check',
            'GET /api-docs': 'Dokumentasi API',
            'GET /api/tenants': 'Get all tenants',
            'PUT /api/tenants': 'Update tenants data'
        }
    });
});

// Route untuk melihat webhooks
app.get('/webhooks', (req, res) => {
    res.json({
        webhooks
    });
});

// Serve static files
app.use(express.static('.'));

// Tenant CRUD API endpoints
const fs = require('fs');
const path = require('path');

const tenantsFilePath = path.join(__dirname, '../data/tenants.json');

// Ensure data directory exists
const dataDir = path.dirname(tenantsFilePath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize tenants file if it doesn't exist
if (!fs.existsSync(tenantsFilePath)) {
    const initialData = {
        tenants: {
            "1": { "MANAGEMENT BUILDING": "6285890392419" },
            "2": { "PT SPM": "6285890392419", "PT DYAFERA": "6285890392419", "PT BOER": "6285890392419", "PT DQS": "6285890392419" },
            "3": { "SIBARANI & CO": "6285890392419", "PT WALASUJI PADMARRIN": "6285890392419", "PT DUMA NUSATAMA": "6285890392419" },
            "5": { "JALIN KOMUNIKASI INDONESIA": "6285890392419", "PRIMA ROBERTUS DAN REKAN": "6285890392419" },
            "6": { "PT SINERGI MULTI ADI SOLUSI": "6285890392419", "PT NUSA GROUP": "6282140009711" },
            "7": { "PT. RIG": "6285890392419" },
            "8": { "PT HARNER": "6285890392419" },
            "9": { "PT MULTINDO TECHNOLOGY UTAMA": "628212223456" },
            "10": { "PT TIGAPILAR": "6285890392419", "PT LIPPING MINING": "6285890392419", "PT TRISINO TEKNIK SOLUSINDO": "6285890392419" },
            "11": { "PT DWIWARNA SENTOSA RIA": "6285890392419" },
            "12": { "PT VOFFICE": "6285890392419" },
            "15": { "PT JARVIS INTEGRASI SOLUSI": "6285890392419", "PT MAHAKARYA GEMILANG HODI": "6285890392419" }
        }
    };
    fs.writeFileSync(tenantsFilePath, JSON.stringify(initialData, null, 2));
}

// GET /api/tenants - Get all tenants
app.get('/api/tenants', (req, res) => {
    try {
        const data = fs.readFileSync(tenantsFilePath, 'utf8');
        const tenants = JSON.parse(data);
        res.json(tenants);
    } catch (error) {
        console.error('Error reading tenants file:', error);
        res.status(500).json({ error: 'Failed to read tenants data' });
    }
});

// PUT /api/tenants - Update all tenants
app.put('/api/tenants', (req, res) => {
    try {
        const { tenants } = req.body;
        if (!tenants) {
            return res.status(400).json({ error: 'Tenants data is required' });
        }
        
        const data = { tenants };
        fs.writeFileSync(tenantsFilePath, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Tenants data updated successfully' });
    } catch (error) {
        console.error('Error writing tenants file:', error);
        res.status(500).json({ error: 'Failed to save tenants data' });
    }
});

// Route untuk halaman utama - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

if (require.main === module) {
    // Jalankan bot dan API
    console.log('🚀 Memulai WaziumBot...');

    startWaziumBot().then((bot) => {
        waziumBotInstance = bot;

        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(` 🌐 API server berjalan di port ${PORT}`);
            console.log(` 📖 Dokumentasi API: http://localhost:${PORT}/api-docs`);
            console.log(` ❤️  Health check: http://localhost:${PORT}/health`);
            console.log(` 📊 Status bot: http://localhost:${PORT}/bot-status`);
            console.log(color(` ======================================================>`, 'cyan'));
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Menerima SIGTERM, menghentikan server...');
            isShuttingDown = true;
            server.close(() => {
                console.log('✅ Server berhasil dihentikan');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🛑 Menerima SIGINT, menghentikan server...');
            isShuttingDown = true;
            server.close(() => {
                console.log('✅ Server berhasil dihentikan');
                process.exit(0);
            });
        });

    }).catch((err) => {
        console.error('❌ Gagal memulai WaziumBot:', err);
        process.exit(1);
    });
}

process.on('uncaughtException', function (err) {
    let e = String(err)
    if (e.includes("conflict")) return
    if (e.includes("Cannot derive from empty media key")) return
    if (e.includes("Socket connection timeout")) return
    if (e.includes("not-authorized")) return
    if (e.includes("already-exists")) return
    if (e.includes("rate-overlimit")) return
    if (e.includes("Connection Closed")) return
    if (e.includes("Timed Out")) return
    if (e.includes("Value not found")) return
    console.log('Caught exception: ', err)
})

const smsg = (WaziumBot, m, store) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = WaziumBot.decodeJid(m.fromMe && WaziumBot.user.id || m.participant || m.key.participant || m.chat || '');
        if (m.isGroup) m.participant = WaziumBot.decodeJid(m.key.participant) || '';
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        m.body = m.message.conversation || m.msg.caption || m.msg.selectedId || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text;
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0];
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = Object.keys(m.quoted)[0];
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = WaziumBot.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === WaziumBot.decodeJid(WaziumBot.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false;
                let q = await store.loadMessage(m.chat, m.quoted.id, conn);
                return smsg(conn, q, store);
            };
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? {
                    participant: m.quoted.sender
                } : {})
            });
            m.quoted.delete = () => WaziumBot.sendMessage(m.quoted.chat, {
                delete: vM.key
            });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => WaziumBot.copyNForward(jid, vM, forceForward, options);
            m.quoted.download = () => WaziumBot.downloadMediaMessage(m.quoted);
        }
    }
    if (m.msg.url) m.download = () => WaziumBot.downloadMediaMessage(m.msg);
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || m.msg.selectedId || '';
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? WaziumBot.sendMedia(chatId, text, 'file', '', m, {
        ...options
    }) : WaziumBot.sendText(chatId, text, m, {
        ...options
    });
    m.copy = () => smsg(conn, M.fromObject(M.toObject(m)));
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => WaziumBot.copyNForward(jid, m, forceForward, options);

    WaziumBot.appenTextMessage = async (text, chatUpdate) => {
        let messages = await generateWAMessage(m.chat, {
            text: text,
            mentions: m.mentionedJid
        }, {
            userJid: WaziumBot.user.id,
            quoted: m.quoted && m.quoted.fakeObj
        });
        messages.key.fromMe = areJidsSameUser(m.sender, WaziumBot.user.id);
        messages.key.id = m.key.id;
        messages.pushName = m.pushName;
        if (m.isGroup) messages.participant = m.sender;
        let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: 'append'
        };
        WaziumBot.ev.emit('messages.upsert', msg);
    };
    return m;
};
