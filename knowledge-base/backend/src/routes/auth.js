const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('../middleware/auth');

// 密码验证：至少8位，包含大写、小写、数字、特殊符号
function validatePassword(password) {
    if (!password || password.length < 8) {
        return '密码至少8位';
    }
    if (!/[A-Z]/.test(password)) {
        return '密码需包含至少一个大写字母';
    }
    if (!/[a-z]/.test(password)) {
        return '密码需包含至少一个小写字母';
    }
    if (!/[0-9]/.test(password)) {
        return '密码需包含至少一个数字';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        return '密码需包含至少一个特殊符号';
    }
    return null;
}

function createAuthRouter(db) {
    const router = express.Router();

    // 用户登录
    router.post('/login', (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        try {
            const trimmedUsername = String(username).trim();
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmedUsername);

            if (!user || !bcrypt.compareSync(password, user.password)) {
                return res.status(401).json({ error: '用户名或密码错误' });
            }

            const token = generateToken(user);

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    must_change_password: user.must_change_password === 1
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: '登录失败' });
        }
    });

    // 获取当前用户信息
    router.get('/me', authenticateToken, (req, res) => {
        try {
            const user = db.prepare('SELECT id, username, role, must_change_password, created_at FROM users WHERE id = ?').get(req.user.id);

            if (!user) {
                return res.status(404).json({ error: '用户不存在' });
            }

            res.json({
                ...user,
                must_change_password: user.must_change_password === 1
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: '获取用户信息失败' });
        }
    });

    // 修改密码
    router.put('/password', authenticateToken, (req, res) => {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写原密码和新密码' });
        }

        // 安全：验证新密码强度
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

            if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
                return res.status(400).json({ error: '原密码错误' });
            }

            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            // 修改密码后清除必须修改密码标记
            db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hashedPassword, req.user.id);

            res.json({ message: '密码修改成功' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: '修改密码失败' });
        }
    });

    return router;
}

module.exports = createAuthRouter;
