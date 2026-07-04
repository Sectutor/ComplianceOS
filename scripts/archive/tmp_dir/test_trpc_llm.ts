import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../packages/core/src/routers';
import superjson from 'superjson';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: 'http://127.0.0.1:3002/api/trpc',
        }),
    ],
    transformer: superjson,
});

async function test() {
    try {
        console.log('Testing llm.list...');
        const result = await (client.llm.list as any).query();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.data) {
            console.error('Data:', JSON.stringify(err.data, null, 2));
        }
    }
}

test();
