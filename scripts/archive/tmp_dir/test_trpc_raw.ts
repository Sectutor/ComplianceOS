import dotenv from 'dotenv';
import fs from 'fs';

// Load env
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

async function test() {
    try {
        console.log('Testing llm.list raw...');
        const url = 'http://127.0.0.1:3002/api/trpc/llm.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D';
        const response = await fetch(url);
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

test();
