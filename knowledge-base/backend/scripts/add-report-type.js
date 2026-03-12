const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/knowledge.db');

async function migrate() {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('开始迁移：添加工作报告类型支持...');

    try {
        // 1. 创建新表（包含 report 类型和 html_file 字段）
        db.run(`
            CREATE TABLE IF NOT EXISTS items_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN ('link', 'article', 'report')),
                title TEXT NOT NULL,
                url TEXT,
                description TEXT,
                content TEXT,
                content_type TEXT CHECK(content_type IN ('markdown', 'richtext', 'html')),
                html_file TEXT,
                author_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        `);

        // 2. 复制数据
        db.run(`
            INSERT INTO items_new (id, type, title, url, description, content, content_type, author_id, created_at, updated_at)
            SELECT id, type, title, url, description, content, content_type, author_id, created_at, updated_at
            FROM items
        `);

        // 3. 删除旧表
        db.run('DROP TABLE items');

        // 4. 重命名新表
        db.run('ALTER TABLE items_new RENAME TO items');

        // 5. 重建索引
        db.run('CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)');
        db.run('CREATE INDEX IF NOT EXISTS idx_items_author ON items(author_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC)');

        // 保存数据库
        const data = db.export();
        fs.writeFileSync(dbPath, data);

        console.log('✓ 迁移成功！已添加 report 类型和 html_file 字段');
    } catch (error) {
        console.error('迁移失败:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

migrate();
