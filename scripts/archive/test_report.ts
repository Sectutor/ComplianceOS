
const { generateGapAnalysisReport } = require('./packages/core/src/lib/reporting');
const fs = require('fs');

async function test() {
    try {
        console.log('Starting report generation for client 3...');
        const buffer = await generateGapAnalysisReport(3);
        console.log('Success! Buffer size:', buffer.length);
        fs.writeFileSync('test_report.pdf', buffer);
    } catch (err) {
        console.error('Error during report generation:', err);
    } finally {
        process.exit(0);
    }
}

test();
