const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const root = process.env.PDF_MANAGER_DATA_DIR || __dirname;
const uploadRoot = path.join(root, 'uploads');
const indexPath = path.join(root, 'main.json');
const uploader = multer({ storage: multer.memoryStorage(), limits: { files: 20, fileSize: 20 * 1024 * 1024 } });
let queue = Promise.resolve();

async function init() {
    await fs.mkdir(uploadRoot, { recursive: true });
    try { await fs.access(indexPath); }
    catch (error) {
        if (error.code !== 'ENOENT') throw error;
        let rows = [];
        try {
            const legacy = await fs.readFile(path.join(root, 'main.txt'), 'utf8');
            rows = legacy.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
                const [id, phone, password, file] = line.split('|').map(value => value.trim());
                return { id: Number(id), phone, password, file: Number(file) };
            });
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        await saveRecords(rows);
    }
}
async function records() {
    return JSON.parse(await fs.readFile(indexPath, 'utf8'));
}
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));
app.get('/api/records', async (req, res) => {
    try { res.json(await records()); }
    catch { res.status(500).json({ error: 'Could not read records' }); }
});
async function saveRecords(rows) {
    const temporary = `${indexPath}.${crypto.randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporary, JSON.stringify(rows, null, 4) + '\n');
        await fs.rename(temporary, indexPath);
    } finally { await fs.rm(temporary, { force: true }); }
}
app.delete('/api/records/:dir', (req, res) => {
    const job = async () => {
        if (!/^[1-9]\d*$/.test(req.params.dir)) return res.status(400).json({ error: 'Invalid directory' });
        const rows = await records();
        const index = rows.findIndex(r => r.id === Number(req.params.dir));
        if (index < 0) return res.status(404).json({ error: 'Record not found' });
        const destination = path.join(uploadRoot, req.params.dir);
        const temporary = path.join(uploadRoot, `.deleted-${crypto.randomUUID()}`);
        let moved = false;
        try { await fs.rename(destination, temporary); moved = true; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        rows.splice(index, 1);
        try { await saveRecords(rows); }
        catch (error) { if (moved) await fs.rename(temporary, destination); throw error; }
        if (moved) await fs.rm(temporary, { recursive: true, force: true });
        res.json({ success: true });
    };
    const next = queue.then(job);
    queue = next.catch(() => {});
    next.catch(() => res.status(500).json({ error: 'Delete failed' }));
});
app.post('/api/upload', uploader.array('files', 20), (req, res) => {
    const job = async () => {
        const { phone, password } = req.body;
        const files = req.files || [];
        if (!/^\+?[0-9]{7,15}$/.test(phone || '') || !password || /[\r\n|]/.test(password) || !files.length) {
            return res.status(400).json({ error: 'Invalid phone, password, or files' });
        }
        for (const file of files) {
            if (!file.originalname.toLowerCase().endsWith('.pdf') || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
                return res.status(400).json({ error: 'Only PDF files are allowed' });
            }
            try { await PDFDocument.load(file.buffer, { ignoreEncryption: false }); }
            catch { return res.status(400).json({ error: 'A PDF is invalid or encrypted' }); }
        }
        const existing = await records();
        const dirs = await fs.readdir(uploadRoot, { withFileTypes: true });
        const max = Math.max(0, ...existing.map(r => Number(r.id) || 0), ...dirs.filter(d => d.isDirectory() && /^\d+$/.test(d.name)).map(d => Number(d.name)));
        const dir = String(max + 1);
        const destination = path.join(uploadRoot, dir);
        await fs.mkdir(destination);
        try {
            for (let i = 0; i < files.length; i++) {
                await fs.writeFile(path.join(destination, `${i + 1}.pdf`), files[i].buffer, { flag: 'wx' });
            }
            await saveRecords([...existing, { id: Number(dir), phone, password, file: files.length }]);
            return res.status(201).json({ id: Number(dir), file: files.length });
        } catch (error) {
            await fs.rm(destination, { recursive: true, force: true });
            throw error;
        }
    };
    const next = queue.then(job);
    queue = next.catch(() => { });
    next.catch(() => res.status(500).json({ error: 'Upload failed' }));
});
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
});
if (require.main === module) {
    init().then(() => {
        const port = process.env.PORT || 3000;
        const server = app.listen(port);
        server.once('listening', () => console.log(`http://localhost:${server.address().port}`));
        server.on('error', error => {
            console.error(error.code === 'EADDRINUSE'
                ? `Port ${port} is already in use. Stop the running server and try again.`
                : error.message);
            process.exitCode = 1;
        });
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { app, init };
