const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data/knowledge.db');
const schemaPath = path.join(__dirname, 'schema.sql');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    // 如果数据库文件存在，则加载
    let data = null;
    if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
    }

    db = new SQL.Database(data);

    // 执行 schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);

    // 检查并添加 must_change_password 列（兼容旧数据库）
    try {
        const tableInfo = db.exec("PRAGMA table_info(users)");
        if (tableInfo.length > 0) {
            const columns = tableInfo[0].values.map(row => row[1]);
            if (!columns.includes('must_change_password')) {
                db.run('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0');
                console.log('Added must_change_password column to users table');
            }
        }
    } catch (e) {
        console.log('Note: could not check/add must_change_password column:', e.message);
    }

    // 创建默认管理员账号（如果不存在）
    const adminResult = db.exec("SELECT id FROM users WHERE username = 'admin'");
    if (adminResult.length === 0 || adminResult[0].values.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, ?)', ['admin', hashedPassword, 'admin', 0]);
        console.log('Default admin account created: admin / admin123');
    }

    // 保存数据库
    saveDatabase();

    return createDbWrapper();
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// 创建一个兼容 better-sqlite3 API 的包装器
function createDbWrapper() {
    return {
        prepare(sql) {
            return {
                run(...params) {
                    db.run(sql, params);
                    // 使用 prepare/step 方式获取 lastInsertRowid（更可靠）
                    const stmt = db.prepare('SELECT last_insert_rowid() as id');
                    let lastId = null;
                    if (stmt.step()) {
                        lastId = stmt.getAsObject().id;
                    }
                    stmt.free();
                    saveDatabase();
                    return { lastInsertRowid: lastId, changes: db.getRowsModified() };
                },
                get(...params) {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    if (stmt.step()) {
                        const row = stmt.getAsObject();
                        stmt.free();
                        return row;
                    }
                    stmt.free();
                    return null;
                },
                all(...params) {
                    const result = db.exec(sql, params);
                    if (result.length === 0) return [];
                    const columns = result[0].columns;
                    return result[0].values.map(row => {
                        const obj = {};
                        columns.forEach((col, i) => obj[col] = row[i]);
                        return obj;
                    });
                }
            };
        },
        exec(sql) {
            db.run(sql);
            saveDatabase();
        },
        pragma() {},
        close() {
            if (db) {
                saveDatabase();
                db.close();
                db = null;
            }
        }
    };
}

module.exports = { initDatabase, dbPath };
