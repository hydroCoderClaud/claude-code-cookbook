const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 默认密码
const DEFAULT_PASSWORD = 'Abc@1234';

// 用户名验证
const USERNAME_REGEX = /^[\w\u4e00-\u9fa5]{3,20}$/;

function createUsersRouter(db) {
    const router = express.Router();

    // 获取用户列表（管理员）
    router.get('/', authenticateToken, requireAdmin, (req, res) => {
        try {
            const users = db.prepare(`
                SELECT id, username, role, must_change_password, created_at
                FROM users
                ORDER BY created_at DESC
            `).all();

            res.json(users.map(u => ({
                ...u,
                must_change_password: u.must_change_password === 1
            })));
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: '获取用户列表失败' });
        }
    });

    // 创建用户（管理员）
    router.post('/', authenticateToken, requireAdmin, (req, res) => {
        const { username, role = 'user' } = req.body;

        if (!username) {
            return res.status(400).json({ error: '用户名不能为空' });
        }

        const trimmedUsername = String(username).trim();
        if (!USERNAME_REGEX.test(trimmedUsername)) {
            return res.status(400).json({ error: '用户名只能包含字母、数字、下划线或中文，长度3-20位' });
        }

        if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ error: '角色只能是 user 或 admin' });
        }

        try {
            const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername);
            if (existing) {
                return res.status(400).json({ error: '用户名已存在' });
            }

            const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
            db.prepare(`
                INSERT INTO users (username, password, role, must_change_password)
                VALUES (?, ?, ?, 1)
            `).run(trimmedUsername, hashedPassword, role);

            // 查询刚创建的用户（更可靠的方式）
            const newUser = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUsername);

            res.status(201).json({
                id: newUser?.id,
                username: trimmedUsername,
                role,
                must_change_password: true,
                default_password: DEFAULT_PASSWORD,
                message: `用户创建成功，默认密码：${DEFAULT_PASSWORD}`
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: '创建用户失败' });
        }
    });

    // 修改用户（管理员）
    router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
        const { username, role, reset_password } = req.body;
        const userId = req.params.id;

        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!user) {
                return res.status(404).json({ error: '用户不存在' });
            }

            // 不能修改自己的角色（防止管理员把自己降级）
            if (parseInt(userId) === req.user.id && role && role !== user.role) {
                return res.status(400).json({ error: '不能修改自己的角色' });
            }

            let updateFields = [];
            let params = [];

            if (username) {
                const trimmedUsername = String(username).trim();
                if (!USERNAME_REGEX.test(trimmedUsername)) {
                    return res.status(400).json({ error: '用户名格式不正确' });
                }
                const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmedUsername, userId);
                if (existing) {
                    return res.status(400).json({ error: '用户名已存在' });
                }
                updateFields.push('username = ?');
                params.push(trimmedUsername);
            }

            if (role && (role === 'user' || role === 'admin')) {
                updateFields.push('role = ?');
                params.push(role);
            }

            // 重置密码
            if (reset_password) {
                const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
                updateFields.push('password = ?');
                updateFields.push('must_change_password = 1');
                params.push(hashedPassword);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ error: '没有要修改的内容' });
            }

            params.push(userId);
            db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

            const updatedUser = db.prepare('SELECT id, username, role, must_change_password, created_at FROM users WHERE id = ?').get(userId);

            res.json({
                ...updatedUser,
                must_change_password: updatedUser.must_change_password === 1,
                ...(reset_password ? { default_password: DEFAULT_PASSWORD, message: `密码已重置为：${DEFAULT_PASSWORD}` } : {})
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: '修改用户失败' });
        }
    });

    // 删除用户（管理员，不删除文章）
    router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
        const userId = req.params.id;

        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!user) {
                return res.status(404).json({ error: '用户不存在' });
            }

            // 不能删除自己
            if (parseInt(userId) === req.user.id) {
                return res.status(400).json({ error: '不能删除自己' });
            }

            // 删除用户（文章保留，author_id 会变成无效引用，但不影响显示）
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);

            res.json({ message: '用户删除成功，其发布的内容已保留' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: '删除用户失败' });
        }
    });

    return router;
}

module.exports = createUsersRouter;
