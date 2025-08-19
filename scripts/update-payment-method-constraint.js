const Database = require('better-sqlite3');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, '../database.db');

// 连接数据库
const db = new Database(dbPath, { fileMustExist: true });
console.log('成功连接到SQLite数据库');

try {
  // 1. 创建一个新表，包含更新后的约束
  console.log('创建临时表...');
  db.exec(`
    CREATE TABLE orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT NOT NULL,
      phoneNumber TEXT NOT NULL,
      address TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      model TEXT NOT NULL,
      isNew INTEGER NOT NULL CHECK (isNew IN (0, 1)),
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      paymentMethod INTEGER NOT NULL CHECK (paymentMethod IN (1, 2, 3, 4, 5)),
      notes TEXT,
      profit REAL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      province TEXT,
      city TEXT,
      district TEXT,
      detailAddress TEXT,
      fullAddress TEXT,
      brand TEXT,
      purchaseTime TEXT
    );
  `);
  console.log('临时表创建成功');

  // 2. 复制旧表数据到新表
  console.log('复制数据...');
  db.exec('INSERT INTO orders_new SELECT * FROM orders;');
  console.log('数据复制成功');

  // 3. 删除旧表
  console.log('删除旧表...');
  db.exec('DROP TABLE orders;');
  console.log('旧表删除成功');

  // 4. 将新表重命名为旧表名称
  console.log('重命名新表...');
  db.exec('ALTER TABLE orders_new RENAME TO orders;');
  console.log('新表重命名成功');

  console.log('成功更新paymentMethod字段约束，现在支持值1-5');
} catch (error) {
  console.error('操作失败:', error.message);
  // 尝试回滚操作
  try {
    db.exec('DROP TABLE IF EXISTS orders_new;');
  } catch (rollbackError) {
    console.error('回滚操作失败:', rollbackError.message);
  }
  process.exit(1);
} finally {
  db.close();
}