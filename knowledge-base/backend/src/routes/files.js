const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, optionalAuth, requireAdmin } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

// 上传目录
const uploadDir = path.join(__dirname, '../../data/uploads');

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
        cb(null, uniqueName);
    }
});

// 文件过滤和大小限制
const upload = multer({
    storage,
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 禁止的危险文件类型
        const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp', '.aspx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (dangerousExts.includes(ext)) {
            cb(new Error('不允许上传此类型的文件'));
            return;
        }
        cb(null, true);
    }
});

function createFilesRouter(db) {
    const router = express.Router();

    // 获取文件列表（所有用户可访问，包括游客）
    router.get('/', optionalAuth, (req, res) => {
        try {
            const files = db.prepare(`
                SELECT f.*, u.username as uploader_name
                FROM files f
                LEFT JOIN users u ON f.uploader_id = u.id
                ORDER BY f.created_at DESC
            `).all();

            res.json({ files });
        } catch (error) {
            console.error('Get files error:', error);
            res.status(500).json({ error: '获取文件列表失败' });
        }
    });

    // 上传文件（仅管理员）
    router.post('/', authenticateToken, requireAdmin, upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: '请选择要上传的文件' });
        }

        const { description } = req.body;
        const safeDesc = description ? sanitizeText(description) : null;

        try {
            db.prepare(`
                INSERT INTO files (filename, original_name, mimetype, size, description, uploader_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                req.file.filename,
                req.file.originalname,
                req.file.mimetype,
                req.file.size,
                safeDesc,
                req.user.id
            );

            // 查询刚插入的文件
            const file = db.prepare(`
                SELECT f.*, u.username as uploader_name
                FROM files f
                LEFT JOIN users u ON f.uploader_id = u.id
                WHERE f.filename = ?
            `).get(req.file.filename);

            res.status(201).json(file);
        } catch (error) {
            console.error('Upload file error:', error);
            // 删除已上传的文件
            fs.unlink(path.join(uploadDir, req.file.filename), () => {});
            res.status(500).json({ error: '上传失败' });
        }
    });

    // 下载文件（所有用户可访问，包括游客）
    router.get('/:id/download', optionalAuth, (req, res) => {
        try {
            const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

            if (!file) {
                return res.status(404).json({ error: '文件不存在' });
            }

            const filePath = path.join(uploadDir, file.filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: '文件已被删除' });
            }

            // 设置响应头，支持中文文件名
            const encodedFilename = encodeURIComponent(file.original_name);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
            res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');

            res.sendFile(filePath);
        } catch (error) {
            console.error('Download file error:', error);
            res.status(500).json({ error: '下载失败' });
        }
    });

    // 删除文件（仅管理员）
    router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
        try {
            const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

            if (!file) {
                return res.status(404).json({ error: '文件不存在' });
            }

            // 删除物理文件
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // 删除数据库记录
            db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('Delete file error:', error);
            res.status(500).json({ error: '删除失败' });
        }
    });

    // 错误处理中间件（处理 multer 错误）
    router.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: '文件大小不能超过 200MB' });
            }
            return res.status(400).json({ error: '文件上传错误' });
        }
        if (err.message) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    });

    return router;
}

module.exports = createFilesRouter;
