const express = require('express');
const { optionalAuth } = require('../middleware/auth');

function createTagsRouter(db) {
    const router = express.Router();

    // 获取所有标签（带使用次数）- 游客可访问
    router.get('/', optionalAuth, (req, res) => {
        try {
            const tags = db.prepare(`
                SELECT t.id, t.name, COUNT(it.item_id) as count
                FROM tags t
                LEFT JOIN item_tags it ON t.id = it.tag_id
                GROUP BY t.id
                ORDER BY count DESC, t.name ASC
            `).all();

            res.json(tags);
        } catch (error) {
            console.error('Get tags error:', error);
            res.status(500).json({ error: '获取标签失败' });
        }
    });

    // 获取某标签下的条目 - 游客可访问
    router.get('/:id/items', optionalAuth, (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        try {
            const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);

            if (!tag) {
                return res.status(404).json({ error: '标签不存在' });
            }

            const countResult = db.prepare(`
                SELECT COUNT(*) as total
                FROM items i
                JOIN item_tags it ON i.id = it.item_id
                WHERE it.tag_id = ?
            `).get(req.params.id);

            const items = db.prepare(`
                SELECT i.*, u.username as author_name
                FROM items i
                LEFT JOIN users u ON i.author_id = u.id
                JOIN item_tags it ON i.id = it.item_id
                WHERE it.tag_id = ?
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?
            `).all(req.params.id, parseInt(limit), offset);

            // 获取每个条目的所有标签
            const getTagsStmt = db.prepare(`
                SELECT t.id, t.name FROM tags t
                JOIN item_tags it ON t.id = it.tag_id
                WHERE it.item_id = ?
            `);

            const itemsWithTags = items.map(item => ({
                ...item,
                tags: getTagsStmt.all(item.id)
            }));

            res.json({
                tag,
                items: itemsWithTags,
                total: countResult.total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('Get tag items error:', error);
            res.status(500).json({ error: '获取标签条目失败' });
        }
    });

    return router;
}

module.exports = createTagsRouter;
