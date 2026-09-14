$f = 'D:\OneDrive - Intellfence\WebDev\ComplianceOS\server_entry.ts'
$encoding = [System.Text.Encoding]::UTF8
$c = [System.IO.File]::ReadAllText($f, $encoding)

$marker = "app.use('/api/v1', apiV1Router);`r`nconsole.log('[API v1] Compliance Agent REST API mounted at /api/v1');"

$replacement = @"
app.use('/api/v1', apiV1Router);
console.log('[API v1] Compliance Agent REST API mounted at /api/v1');

// API Documentation (Swagger UI + OpenAPI spec)
const OPENAPI_DIR = path.join(process.cwd(), 'openapi');
app.get('/api/docs', (_req: express.Request, res: express.Response) => {
  try {
    const html = readFileSync(path.join(OPENAPI_DIR, 'swagger.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load API docs', code: 'DOCS_ERROR', detail: err.message });
  }
});
app.get('/api/spec', (_req: express.Request, res: express.Response) => {
  try {
    const spec = readFileSync(path.join(OPENAPI_DIR, 'api-v1.yaml'), 'utf-8');
    res.setHeader('Content-Type', 'application/x-yaml; charset=utf-8');
    res.send(spec);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load API spec', code: 'SPEC_ERROR', detail: err.message });
  }
});
console.log('[API docs] Swagger UI at /api/docs, spec at /api/spec');
"@

if ($c.Contains($marker)) {
    $c = $c.Replace($marker, $replacement)
    [System.IO.File]::WriteAllText($f, $c, $encoding)
    Write-Output "PATCHED: server_entry.ts updated with /api/docs and /api/spec endpoints"
} else {
    Write-Output "ERROR: marker not found in server_entry.ts"
}
