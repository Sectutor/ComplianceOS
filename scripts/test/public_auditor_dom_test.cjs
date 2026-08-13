// End-to-end DOM test for public-auditor using jsdom (matches current flow)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = 'D:/OneDrive - Intellfence/WebDev/ComplianceOS/public-auditor';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const standardsJs = fs.readFileSync(path.join(dir, 'standards.js'), 'utf8');
const auditorJs = fs.readFileSync(path.join(dir, 'auditor.js'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.lucide = { createIcons: () => {} };
window.print = () => {};
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('\u2713', name); }
  else { fail++; console.log('\u2717', name); }
}
const vis = id => !window.document.getElementById(id).classList.contains('hidden');

window.eval(standardsJs);
check('STANDARDS loaded', typeof window.STANDARDS === 'object');
check('OWASP LLM = 10', window.STANDARDS.OWASP_LLM.length === 10);
check('EU AI Act = 13', window.STANDARDS.EU_AI_ACT.length === 13);
check('Playbooks >= 24', Object.keys(window.STANDARDS.ALL_PLAYBOOKS).length >= 24);

window.eval(auditorJs);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

// Flow: welcome -> policy -> checklist -> scan -> results
window.document.getElementById('btn-welcome-proceed').click();
check('Policy step visible after proceed', vis('step-policy'));

window.document.getElementById('btn-policy-run').click();
check('Checklist step visible after policy', vis('step-checklist'));

const cards = window.document.getElementById('container-hermes-checks').children.length +
              window.document.getElementById('container-host-checks').children.length;
check('Checklist cards rendered', cards > 0);
console.log('  total checklist cards:', cards);

window.document.getElementById('btn-checklist-continue').click();
check('Scan step visible', vis('step-scan'));

// Skip scan -> triggers email gate modal; fill it to proceed
window.document.getElementById('btn-scan-skip').click();
const emailForm = window.document.getElementById('email-gate-form');
check('Email gate modal appeared', !!emailForm);
if (emailForm) {
  window.document.getElementById('gate-email-input').value = 'test@example.com';
  emailForm.dispatchEvent(new window.Event('submit'));
}

// Poll for the async "Report Sent" continue button, click it, then assert results
let tries = 0;
const finish = () => {
  const cont = window.document.getElementById('btn-email-continue');
  if (cont) {
    cont.click();
    const scoreNum = window.document.getElementById('results-score-num').textContent;
    check('Results step visible', vis('step-results'));
    check('Score displayed', /%$/.test(scoreNum));
    console.log('  score:', scoreNum);
    const gaps = window.document.getElementById('results-gaps-container').children.length;
    check('Gaps rendered', gaps > 0);
    console.log('  gap cards:', gaps);
    const premiumHidden = window.document.getElementById('premium-upgrade-card').classList.contains('hidden');
    check('Premium card HIDDEN (DEV_BYPASS active)', premiumHidden);
    console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
    process.exit(fail > 0 ? 1 : 0);
  } else if (tries++ < 20) {
    setTimeout(finish, 50);
  } else {
    fail++;
    console.log('\u2717 Email gate continue button never appeared');
    console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
    process.exit(1);
  }
};
setTimeout(finish, 50);
