/**
 * Desktop Agent - WhatsApp Web Connection Handler
 * Runs on your PC - Handles WhatsApp Web connection locally
 * Communicates with cloud server only for AI processing
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const notifier = require('node-notifier');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { exec } = require('child_process');
require('dotenv').config();

// Configuration
const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || 'http://13.62.57.240:8080';
const LOCAL_PORT = process.env.LOCAL_PORT || 3001;
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || '971507055253'; // Your WhatsApp number
let TENANT_ID = null; // Will be fetched from cloud based on phone
const API_KEY = process.env.API_KEY || '';
let isAuthenticated = true; // Auto-authenticate

// Find Chrome executable
function findChrome() {
    const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    
    for (const chromePath of possiblePaths) {
        if (fs.existsSync(chromePath)) {
            console.log(`✅ Found browser: ${chromePath}`);
            return chromePath;
        }
    }
    
    console.log('⚠️  No Chrome/Edge found. Install Google Chrome from: https://www.google.com/chrome/');
    return null;
}

const executablePath = findChrome();

if (!executablePath) {
    console.error('\n❌ ERROR: Chrome or Edge browser not found!');
    console.error('📥 Please install Google Chrome from: https://www.google.com/chrome/');
    console.error('   Or Microsoft Edge from: https://www.microsoft.com/edge');
    process.exit(1);
}

// Create local Express server for authentication callback
const localApp = express();
localApp.use(express.json());

// Health check endpoint
localApp.get('/health', (req, res) => {
    res.json({ 
        status: 'running',
        authenticated: isAuthenticated,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString()
    });
});

// Authentication callback endpoint
localApp.post('/auth-callback', (req, res) => {
    const { tenantId, phone } = req.body;
    
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
    }
    
    TENANT_ID = tenantId;
    isAuthenticated = true;
    
    // Save to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    if (envContent.includes('TENANT_ID=')) {
        envContent = envContent.replace(/TENANT_ID=.*/, `TENANT_ID=${tenantId}`);
    } else {
        envContent += `\nTENANT_ID=${tenantId}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n✅ Authenticated as: ${phone}`);
    console.log(`🆔 Tenant ID: ${tenantId}`);
    
    res.json({ 
        ok: true, 
        message: 'Authentication successful. You can close this window.',
        tenantId 
    });
    
    // Initialize WhatsApp client after authentication
    setTimeout(() => {
        initializeWhatsApp();
    }, 2000);
});

// Start local server
localApp.listen(LOCAL_PORT, () => {
    console.log(`🏥 Health endpoint: http://localhost:${LOCAL_PORT}/health`);
});

console.log('🚀 Starting Desktop Agent...');
console.log(`📡 Cloud Server: ${CLOUD_SERVER_URL}`);
console.log(`📱 WhatsApp Phone: ${WHATSAPP_PHONE}`);
console.log('\n🔄 Initializing WhatsApp...');

// Auto-start WhatsApp initialization
initializeWhatsApp();

async function initializeWhatsApp() {
    console.log('\n🔍 Fetching tenant information...');
    
    try {
        // Fetch tenant ID from cloud server using phone number
        const response = await axios.post(`${CLOUD_SERVER_URL}/api/agent-get-tenant`, {
            phoneNumber: WHATSAPP_PHONE
        }, {
            headers: { 'x-api-key': API_KEY }
        });
        
        if (response.data && response.data.tenantId) {
            TENANT_ID = response.data.tenantId;
            console.log(`✅ Tenant ID: ${TENANT_ID}`);
        } else {
            console.error('❌ Phone number not registered. Please register first at:');
            console.error(`   ${CLOUD_SERVER_URL}/agent-login.html`);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Failed to fetch tenant info:', error.message);
        console.error('   Please register at:', `${CLOUD_SERVER_URL}/agent-login.html`);
        process.exit(1);
    }
    
    console.log('\n🔄 Initializing WhatsApp client...');
    
    // WhatsApp Client with local session storage
    const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        executablePath: executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

console.log('🚀 Starting Desktop Agent...');
console.log(`📡 Cloud Server: ${CLOUD_SERVER_URL}`);
console.log(`👤 Tenant ID: ${TENANT_ID}`);

// QR Code Event
client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    notifier.notify({
        title: 'WhatsApp Desktop Agent',
        message: 'Scan QR code to connect',
        sound: true
    });
});

// Ready Event
client.on('ready', async () => {
    console.log('✅ WhatsApp Web connected successfully!');
    console.log('📞 Phone number:', client.info.wid.user);
    
    notifier.notify({
        title: 'WhatsApp Connected',
        message: `Connected as ${client.info.pushname}`,
        sound: true
    });
    
    // Register with cloud server
    try {
        await axios.post(`${CLOUD_SERVER_URL}/api/desktop-agent/register`, {
            tenantId: TENANT_ID,
            phoneNumber: client.info.wid.user,
            deviceName: require('os').hostname(),
            status: 'online'
        }, {
            headers: { 'x-api-key': API_KEY }
        });
        console.log('✅ Registered with cloud server');
    } catch (error) {
        console.error('❌ Failed to register with cloud server:', error.message);
    }
});

// Authenticated Event
client.on('authenticated', () => {
    console.log('🔐 Authentication successful');
});

// Authentication Failure Event
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    notifier.notify({
        title: 'WhatsApp Authentication Failed',
        message: 'Please restart the agent',
        sound: true
    });
});

// Disconnected Event
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp disconnected:', reason);
    notifier.notify({
        title: 'WhatsApp Disconnected',
        message: reason,
        sound: true
    });
});

// Message Received Event
client.on('message', async (message) => {
    try {
        const from = message.from;
        const body = message.body;
        const isGroup = from.endsWith('@g.us');
        const isStatus = from === 'status@broadcast';
        
        // Ignore group messages and status updates
        if (isGroup || isStatus) return;
        
        console.log(`\n📨 Message from ${from}: ${body}`);
        
        // Send to cloud server for AI processing
        const response = await axios.post(
            `${CLOUD_SERVER_URL}/api/desktop-agent/process-message`,
            {
                tenantId: TENANT_ID,
                from: from,
                message: body,
                timestamp: new Date().toISOString(),
                messageId: message.id._serialized
            },
            {
                headers: { 'x-api-key': API_KEY },
                timeout: 30000 // 30 second timeout
            }
        );
        
        const aiResponse = response.data.reply;
        
        if (aiResponse) {
            console.log(`🤖 AI Response: ${aiResponse.substring(0, 100)}...`);
            
            // Send reply via WhatsApp
            await message.reply(aiResponse);
            console.log('✅ Reply sent');
            
            // Optional: Notify cloud that message was sent
            await axios.post(
                `${CLOUD_SERVER_URL}/api/desktop-agent/message-sent`,
                {
                    tenantId: TENANT_ID,
                    messageId: message.id._serialized,
                    sentAt: new Date().toISOString()
                },
                {
                    headers: { 'x-api-key': API_KEY }
                }
            ).catch(() => {}); // Silent fail
        }
        
    } catch (error) {
        console.error('❌ Error processing message:', error.message);
        
        // Fallback response if cloud is down
        try {
            await message.reply('Sorry, I am temporarily unable to process your message. Please try again in a moment.');
        } catch (e) {
            console.error('❌ Failed to send fallback message:', e.message);
        }
    }
});

// Message Create Event (for sent messages)
client.on('message_create', async (message) => {
    // Track outgoing messages if needed
    if (message.fromMe) {
        console.log(`📤 Sent message to ${message.to}: ${message.body}`);
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});

process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    
    // Notify cloud server
    try {
        await axios.post(`${CLOUD_SERVER_URL}/api/desktop-agent/disconnect`, {
            tenantId: TENANT_ID
        }, {
            headers: { 'x-api-key': API_KEY }
        });
    } catch (error) {
        // Silent fail
    }
    
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

// Initialize WhatsApp client
client.initialize();
}
