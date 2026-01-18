const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { sanitizeText, sanitizeHtml, sanitizeUrl } = require('../utils/sanitize');

function createItemsRouter(db) {
    const router = express.Router();

    // 辅助函数：获取条目的标签列表
    const getItemTags = (itemId) => {
        return db.prepare(`
            SELECT t.id, t.name FROM tags t
            JOIN item_tags it ON t.id = it.tag_id
            WHERE it.item_id = ?
        `).all(itemId);
    };

    // 辅助函数：获取条目的评论数量
    const getCommentCount = (itemId) => {
        const result = db.prepare('SELECT COUNT(*) as count FROM comments WHERE item_id = ?').get(itemId);
        return result?.count || 0;
    };

    // 辅助函数：处理并关联标签
    const processAndLinkTags = (itemId, tags) => {
        for (const tagName of tags) {
            if (!tagName || !tagName.trim()) continue;
            const trimmedName = tagName.trim();

            let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(trimmedName);
            if (!tag) {
                // 插入新标签，然后重新查询获取 ID（更可靠）
                db.prepare('INSERT INTO tags (name) VALUES (?)').run(trimmedName);
                tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(trimmedName);
            }

            if (tag && tag.id) {
                const exists = db.prepare('SELECT 1 FROM item_tags WHERE item_id = ? AND tag_id = ?').get(itemId, tag.id);
                if (!exists) {
                    db.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tag.id);
                }
            }
        }
    };

    // 获取列表（支持分页、标签筛选、搜索、排序、时间筛选）
    // 游客可浏览，使用 optionalAuth
    router.get('/', optionalAuth, (req, res) => {
        const { type, tag, q, sort = 'desc', page = 1, limit = 20, time } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        try {
            let query = `
                SELECT DISTINCT i.*, u.username as author_name
                FROM items i
                LEFT JOIN users u ON i.author_id = u.id
            `;
            let countQuery = 'SELECT COUNT(DISTINCT i.id) as total FROM items i';
            const params = [];
            const conditions = [];

            // 标签筛选
            if (tag) {
                query = `
                    SELECT DISTINCT i.*, u.username as author_name
                    FROM items i
                    LEFT JOIN users u ON i.author_id = u.id
                    JOIN item_tags it ON i.id = it.item_id
                    JOIN tags t ON it.tag_id = t.id
                `;
                countQuery = `
                    SELECT COUNT(DISTINCT i.id) as total
                    FROM items i
                    JOIN item_tags it ON i.id = it.item_id
                    JOIN tags t ON it.tag_id = t.id
                `;
                conditions.push('t.name = ?');
                params.push(tag);
            }

            // 类型筛选
            if (type && (type === 'link' || type === 'article')) {
                conditions.push('i.type = ?');
                params.push(type);
            }

            // 时间筛选
            if (time) {
                const timeMap = {
                    'day': "datetime('now', '-1 day')",
                    'week': "datetime('now', '-7 days')",
                    'month': "datetime('now', '-1 month')",
                    'year': "datetime('now', '-1 year')"
                };
                if (timeMap[time]) {
                    conditions.push(`i.created_at >= ${timeMap[time]}`);
                }
            }

            // 搜索（使用 LIKE）
            if (q) {
                conditions.push(`(i.title LIKE ? OR i.description LIKE ?)`);
                params.push(`%${q}%`, `%${q}%`);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }

            const sortDir = sort === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY i.created_at ${sortDir} LIMIT ? OFFSET ?`;

            const countResult = db.prepare(countQuery).get(...params);
            const items = db.prepare(query).all(...params, parseInt(limit), offset);

            // 获取每个条目的标签和评论数
            const itemsWithTags = items.map(item => ({
                ...item,
                tags: getItemTags(item.id),
                comment_count: getCommentCount(item.id)
            }));

            res.json({
                items: itemsWithTags,
                total: countResult.total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('Get items error:', error);
            res.status(500).json({ error: '获取列表失败' });
        }
    });

    // 获取单条详情（游客可浏览）
    router.get('/:id', optionalAuth, (req, res) => {
        try {
            const item = db.prepare(`
                SELECT i.*, u.username as author_name
                FROM items i
                LEFT JOIN users u ON i.author_id = u.id
                WHERE i.id = ?
            `).get(req.params.id);

            if (!item) {
                return res.status(404).json({ error: '条目不存在' });
            }

            res.json({ ...item, tags: getItemTags(item.id) });
        } catch (error) {
            console.error('Get item error:', error);
            res.status(500).json({ error: '获取详情失败' });
        }
    });

    // 创建条目
    router.post('/', authenticateToken, (req, res) => {
        const { type, title, url, description, content, content_type, tags = [] } = req.body;

        if (!type || !title) {
            return res.status(400).json({ error: '类型和标题不能为空' });
        }

        if (type === 'link' && !url) {
            return res.status(400).json({ error: '链接地址不能为空' });
        }

        // 安全：过滤输入
        const safeTitle = sanitizeText(title);
        const safeUrl = type === 'link' ? sanitizeUrl(url) : null;
        const safeDesc = sanitizeText(description);
        const safeContent = content_type === 'richtext' ? sanitizeHtml(content) : content;

        if (type === 'link' && !safeUrl) {
            return res.status(400).json({ error: '链接地址无效' });
        }

        try {
            db.prepare(`
                INSERT INTO items (type, title, url, description, content, content_type, author_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(type, safeTitle, safeUrl, safeDesc || null, safeContent || null, content_type || null, req.user.id);

            // 查询刚插入的条目（更可靠的方式）
            const item = db.prepare(`
                SELECT * FROM items
                WHERE type = ? AND title = ? AND author_id = ?
                ORDER BY id DESC LIMIT 1
            `).get(type, safeTitle, req.user.id);

            const itemId = item.id;

            // 处理标签
            if (tags.length > 0) {
                processAndLinkTags(itemId, tags);
            }

            res.status(201).json({ ...item, tags: getItemTags(itemId) });
        } catch (error) {
            console.error('Create item error:', error);
            res.status(500).json({ error: '创建失败' });
        }
    });

    // 更新条目
    router.put('/:id', authenticateToken, (req, res) => {
        const { title, url, description, content, content_type, tags = [] } = req.body;

        try {
            const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);

            if (!item) {
                return res.status(404).json({ error: '条目不存在' });
            }

            // 只有作者或管理员可以编辑
            if (item.author_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '没有编辑权限' });
            }

            // 安全：过滤输入
            const safeTitle = title ? sanitizeText(title) : item.title;
            const safeUrl = url !== undefined ? (url ? sanitizeUrl(url) : null) : item.url;
            const safeDesc = description !== undefined ? sanitizeText(description) : item.description;
            const safeContent = content !== undefined
                ? (content_type === 'richtext' ? sanitizeHtml(content) : content)
                : item.content;

            db.prepare(`
                UPDATE items
                SET title = ?, url = ?, description = ?, content = ?, content_type = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                safeTitle,
                safeUrl,
                safeDesc,
                safeContent,
                content_type !== undefined ? content_type : item.content_type,
                req.params.id
            );

            // 更新标签
            db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(req.params.id);

            if (tags.length > 0) {
                processAndLinkTags(req.params.id, tags);
            }

            const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
            res.json({ ...updatedItem, tags: getItemTags(req.params.id) });
        } catch (error) {
            console.error('Update item error:', error);
            res.status(500).json({ error: '更新失败' });
        }
    });

    // 删除条目（作者或管理员）
    router.delete('/:id', authenticateToken, (req, res) => {
        try {
            const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);

            if (!item) {
                return res.status(404).json({ error: '条目不存在' });
            }

            // 只有作者或管理员可以删除
            if (item.author_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '没有删除权限' });
            }

            db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('Delete item error:', error);
            res.status(500).json({ error: '删除失败' });
        }
    });

    return router;
}

module.exports = createItemsRouter;
