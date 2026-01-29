import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function scrape() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('Navigating to NIST tool...');
    await page.goto('https://csrc.nist.gov/Projects/cybersecurity-framework/Filters#/csf/filters', { waitUntil: 'networkidle0' });

    console.log('Waiting for Expand All button...');
    await page.waitForSelector('button.btn.btn-default.pull-right');

    console.log('Clicking Expand All...');
    await page.click('button.btn.btn-default.pull-right');

    // Wait for expansion - heuristic wait since there's no clear event
    await new Promise(r => setTimeout(r, 5000));

    console.log('Scraping data...');
    const data = await page.evaluate(() => {
        const finalResults = [];
        const processedIds = new Set();

        const examplesElements = Array.from(document.querySelectorAll('implementation-examples'));

        examplesElements.forEach(el => {
            let id = "";
            let parent = el.closest('.bump-right');
            if (parent) {
                let prev = parent.previousElementSibling;
                while (prev) {
                    const b = prev.querySelector('b');
                    if (b && b.innerText.match(/^[A-Z]{2}\.[A-Z]{2}-\d{2}$/)) {
                        id = b.innerText;
                        break;
                    }
                    prev = prev.previousElementSibling;
                }
            }

            if (id && !processedIds.has(id)) {
                const exampleDivs = Array.from(el.querySelectorAll('div')).filter(div => {
                    const t = div.innerText.trim();
                    return /^Ex\d+/.test(t);
                });

                const examplesString = exampleDivs.map(div => div.innerText.trim()).join('\n');
                if (examplesString) {
                    finalResults.push({ id, examples: examplesString });
                    processedIds.add(id);
                }
            }
        });

        return finalResults;
    });

    console.log(`Scraped ${data.length} items.`);

    await fs.writeFile('scripts/nist_examples.json', JSON.stringify(data, null, 2));
    console.log('Saved to scripts/nist_examples.json');

    await browser.close();
}

scrape().catch(console.error);
