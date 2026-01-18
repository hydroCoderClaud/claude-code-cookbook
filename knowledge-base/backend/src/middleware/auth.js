const jwt = require('jsonwebtoken');

// 生产环境必须设置 JWT_SECRET
const envSecret = process.env.JWT_SECRET;
if (!envSecret && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
}
const JWT_SECRET = envSecret || 'dev-secret-key-not-for-production';

// 验证 JWT Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token 无效或已过期' });
        }
        req.user = user;
        next();
    });
}

// 可选验证（游客可访问，但如果有 token 会解析用户信息）
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
            next();
        });
    } else {
        next();
    }
}

// 验证管理员权限
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
}

// 生成 Token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = { authenticateToken, optionalAuth, requireAdmin, generateToken };
