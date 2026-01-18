const express = require('express');
const { authenticateToken, optionalAuth, requireAdmin } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

function createCommentsRouter(db) {
    const router = express.Router();

    // 获取某条目的所有评论 - 游客可访问
    router.get('/item/:itemId', optionalAuth, (req, res) => {
        try {
            const comments = db.prepare(`
                SELECT c.*, u.username
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.item_id = ?
                ORDER BY c.created_at ASC
            `).all(req.params.itemId);

            res.json(comments);
        } catch (error) {
            console.error('Get comments error:', error);
            res.status(500).json({ error: '获取评论失败' });
        }
    });

    // 添加评论
    router.post('/', authenticateToken, (req, res) => {
        const { item_id, content } = req.body;

        if (!item_id || !content || !content.trim()) {
            return res.status(400).json({ error: '评论内容不能为空' });
        }

        try {
            const item = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id);
            if (!item) {
                return res.status(404).json({ error: '条目不存在' });
            }

            // 安全：过滤评论内容
            const safeContent = sanitizeText(content.trim());

            db.prepare(`
                INSERT INTO comments (item_id, user_id, content)
                VALUES (?, ?, ?)
            `).run(item_id, req.user.id, safeContent);

            // 查询刚插入的评论（更可靠的方式）
            const comment = db.prepare(`
                SELECT c.*, u.username
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.item_id = ? AND c.user_id = ? AND c.content = ?
                ORDER BY c.id DESC
                LIMIT 1
            `).get(item_id, req.user.id, safeContent);

            res.status(201).json(comment);
        } catch (error) {
            console.error('Create comment error:', error);
            res.status(500).json({ error: '评论失败' });
        }
    });

    // 删除评论（本人或管理员）
    router.delete('/:id', authenticateToken, (req, res) => {
        try {
            const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);

            if (!comment) {
                return res.status(404).json({ error: '评论不存在' });
            }

            if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '没有删除权限' });
            }

            db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('Delete comment error:', error);
            res.status(500).json({ error: '删除失败' });
        }
    });

    return router;
}

module.exports = createCommentsRouter;
