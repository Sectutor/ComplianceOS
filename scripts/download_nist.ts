
import fs from 'fs';
import path from 'path';
import https from 'https';

const NIST_OSCAL_URL = "https://raw.githubusercontent.com/usnistgov/oscal-content/master/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json";
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'frameworks', 'nist-800-53-rev5.json');

async function downloadFile() {
    console.log(`Starting download from: ${NIST_OSCAL_URL}`);
    console.log(`Saving to: ${OUTPUT_PATH}`);

    const file = fs.createWriteStream(OUTPUT_PATH);

    return new Promise<void>((resolve, reject) => {
        https.get(NIST_OSCAL_URL, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to consume ${NIST_OSCAL_URL}, status code ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'] || '0', 10);
            let downloaded = 0;
            let lastLoggedPercent = 0;

            response.on('data', (chunk) => {
                downloaded += chunk.length;
                const percent = totalSize ? Math.round((downloaded / totalSize) * 100) : 0;

                if (percent >= lastLoggedPercent + 10) {
                    process.stdout.write(`Downloading... ${percent}%\r`);
                    lastLoggedPercent = percent;
                }

                file.write(chunk);
            });

            response.on('end', () => {
                file.end();
                console.log('\nDownload complete.');
                resolve();
            });

            response.on('error', (err) => {
                fs.unlink(OUTPUT_PATH, () => { }); // Delete partial file
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(OUTPUT_PATH, () => { });
            reject(err);
        });
    });
}

downloadFile().catch(console.error);
