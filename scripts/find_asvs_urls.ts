
async function listFiles() {
    const url = "https://api.github.com/repos/OWASP/ASVS/contents/4.0/en?ref=v4.0.3";
    try {
        const res = await fetch(url, { headers: { "User-Agent": "ComplianceOS-Seed" } });
        if (!res.ok) {
            console.error(`Error: ${res.status}`);
            return;
        }
        const files = await res.json();
        files.forEach((f: any) => console.log(f.name));
    } catch (e) {
        console.error(e);
    }
}
listFiles();
