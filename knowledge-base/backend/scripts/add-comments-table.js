const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function addCommentsTable() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'data/knowledge.db');

    if (!fs.existsSync(dbPath)) {
        console.log('Database not found');
        return;
    }

    const data = fs.readFileSync(dbPath);
    const db = new SQL.Database(data);

    // 检查 comments 表是否存在
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'");

    if (result.length === 0 || result[0].values.length === 0) {
        console.log('Creating comments table...');
        db.run(`
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        db.run('CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id)');

        const buffer = Buffer.from(db.export());
        fs.writeFileSync(dbPath, buffer);
        console.log('Comments table created!');
    } else {
        console.log('Comments table already exists');
    }

    db.close();
}

addCommentsTable().catch(console.error);
