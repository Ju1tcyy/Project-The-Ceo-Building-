// Test script untuk debugging endpoint WaziumBot
const fetch = require('node-fetch');

async function testEndpoint() {
    console.log('Testing WaziumBot endpoint...');
    
    try {
        // Test 1: Check bot status
        console.log('\n1. Testing bot status...');
        const statusResponse = await fetch('http://localhost:3000/bot-status');
        const statusData = await statusResponse.json();
        console.log('Bot Status:', statusData);
        
        // Test 2: Send simple text message
        console.log('\n2. Testing text message...');
        const textResponse = await fetch('http://localhost:3000/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: '6285890392419@s.whatsapp.net',
                message: { text: 'Test message dari debugging script' }
            })
        });
        
        const textData = await textResponse.json();
        console.log('Text Message Response:', textData);
        
        // Test 3: Send image message (using a small test image)
        console.log('\n3. Testing image message...');
        const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const imageResponse = await fetch('http://localhost:3000/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: '6285890392419@s.whatsapp.net',
                message: {
                    image: { url: testImageBase64 },
                    caption: 'Test image dari debugging script'
                }
            })
        });
        
        const imageData = await imageResponse.json();
        console.log('Image Message Response:', imageData);
        
    } catch (error) {
        console.error('Error testing endpoint:', error);
    }
}

testEndpoint();
