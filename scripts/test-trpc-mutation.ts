import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function testMutation() {
    const client = createTRPCProxyClient<any>({
        links: [
            httpBatchLink({
                url: 'http://localhost:3002/api/trpc',
                headers: {
                    'x-client-id': '1',
                    'Authorization': 'Bearer local-dev-token'
                },
            }),
        ],
    });

    try {
        console.log("Calling devProjects.updateRisk...");
        const result = await client.devProjects.updateRisk.mutate({
            id: 1,
            clientId: 1,
            likelihood: 5,
            impact: 5,
            title: "Updated Title - PERSISTENCE TEST"
        });
        console.log("Mutation result:", JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error("Mutation failed:", e.message);
        if (e.data) console.error("Error data:", JSON.stringify(e.data, null, 2));

        if (e.message.includes("fetch failed")) {
            console.log("Retrying on 3001...");
            const client2 = createTRPCProxyClient<any>({
                links: [
                    httpBatchLink({
                        url: 'http://localhost:3001/api/trpc',
                        headers: {
                            'x-client-id': '1',
                            'Authorization': 'Bearer local-dev-token'
                        },
                    }),
                ],
            });
            try {
                const result2 = await client2.devProjects.updateRisk.mutate({
                    id: 1,
                    clientId: 1,
                    likelihood: 5,
                    impact: 5,
                    title: "Updated Title - PERSISTENCE TEST (3001)"
                });
                console.log("Mutation result (3001):", JSON.stringify(result2, null, 2));
            } catch (e2: any) {
                console.error("Mutation failed on 3001:", e2.message);
            }
        }
    }
}

testMutation();
