// Native fetch is available in Node 18+

async function testHttp() {
    console.log("Testing HTTP connection to TRPC...");
    try {
        const response = await fetch('http://localhost:3001/api/trpc/controls.list?batch=1&input=%7B%7D', {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Data received (snippet):", JSON.stringify(data).substring(0, 100));
        } else {
            console.error("HTTP Error:", await response.text());
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testHttp();
