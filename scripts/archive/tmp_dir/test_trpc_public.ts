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
        console.log('Testing waitlist.join (public procedure)...');
        const result = await client.waitlist.join.mutate({
            email: 'test' + Math.random() + '@example.com',
            firstName: 'Test',
            lastName: 'User'
        });
        console.log('Result:', result);
    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

test();
