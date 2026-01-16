/**
 * 迁移脚本：给 users 表添加 must_change_password 字段
 * 运行方式：node scripts/add-must-change-password.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/knowledge.db');

async function migrate() {
    const SQL = await initSqlJs();

    if (!fs.existsSync(DB_PATH)) {
        console.log('数据库文件不存在，跳过迁移');
        return;
    }

    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(fileBuffer);

    try {
        // 检查字段是否已存在
        const tableInfo = db.exec("PRAGMA table_info(users)");
        const columns = tableInfo[0]?.values.map(row => row[1]) || [];

        if (columns.includes('must_change_password')) {
            console.log('must_change_password 字段已存在，跳过迁移');
        } else {
            // 添加字段
            db.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
            console.log('成功添加 must_change_password 字段');
        }

        // 保存数据库
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
        console.log('数据库已保存');

    } catch (error) {
        console.error('迁移失败:', error);
    } finally {
        db.close();
    }
}

migrate();
