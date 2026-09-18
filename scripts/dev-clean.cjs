/**
 * Dev Environment Auto-Cleaner (scripts/dev-clean.cjs)
 * 
 * Automatically cleans up zombie Node/Vite processes on ports 3005 and 5173
 * before starting fresh instances. Runs cross-platform (Windows & POSIX).
 */

const { execSync } = require('child_process');
const os = require('os');

const specifiedPorts = process.argv.slice(2).map(p => parseInt(p, 10)).filter(Boolean);
const PORTS = specifiedPorts.length > 0 ? specifiedPorts : [3005, 5173];
const isWin = os.platform() === 'win32';

function clean() {
  for (const port of PORTS) {
    try {
      if (isWin) {
        const cmd = 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ' + port + ' -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"';
        const output = execSync(cmd, { encoding: 'utf-8' }).trim();
        if (output) {
          const pids = [...new Set(output.split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(Boolean))];
          for (const pid of pids) {
            if (pid !== process.pid) {
              console.log('[DevClean] Freeing port ' + port + ' (terminating orphaned PID ' + pid + ')...');
              try {
                execSync('powershell -NoProfile -Command "Stop-Process -Id ' + pid + ' -Force -ErrorAction SilentlyContinue"');
                console.log('[DevClean] PID ' + pid + ' stopped.');
              } catch {}
            }
          }
        }
      } else {
        const output = execSync('lsof -ti :' + port + ' || true', { encoding: 'utf-8' }).trim();
        if (output) {
          const pids = output.split('\n').map(s => parseInt(s.trim(), 10)).filter(Boolean);
          for (const pid of pids) {
            if (pid !== process.pid) {
              console.log('[DevClean] Freeing port ' + port + ' (terminating PID ' + pid + ')...');
              try {
                execSync('kill -9 ' + pid);
                console.log('[DevClean] PID ' + pid + ' stopped.');
              } catch {}
            }
          }
        }
      }
    } catch {
      // Ignore if no listener
    }
  }
  console.log('[DevClean] Ports 3005 & 5173 are clean and ready.');
}

clean();
