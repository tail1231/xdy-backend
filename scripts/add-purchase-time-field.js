const Database = require('better-sqlite3');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, '../database.db');

// 连接数据库
const db = new Database(dbPath, { fileMustExist: true });
console.log('成功连接到SQLite数据库');

try {
  // 检查表结构
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get();

  if (row) {
    console.log('orders表结构:');
    console.log(row.sql);

    // 检查是否已有purchaseTime字段
    if (row.sql.includes('purchaseTime')) {
      console.log('purchaseTime字段已存在');
    } else {
      // 添加purchaseTime字段
      const alterTableSql = "ALTER TABLE orders ADD COLUMN purchaseTime TEXT";
      db.exec(alterTableSql);
      console.log('成功添加purchaseTime字段');
    }
  } else {
    console.error('未找到orders表');
    process.exit(1);
  }
} catch (error) {
  console.error('操作失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}