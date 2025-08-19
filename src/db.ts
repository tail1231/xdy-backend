import Database from 'better-sqlite3';

class SqliteDatabase {
  private db: Database.Database;

  constructor() {
    // 初始化SQLite数据库连接
    this.db = new Database('./database.db', { fileMustExist: false });
    this.enableForeignKeys();
    this.initTables();
  }

  /** 初始化数据库表结构 */
  private initTables(): void {
    // 创建品类表
    this.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`);

    // 创建品牌表
    this.exec(`
      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, category_id)
      );`);

    // 创建订单表
    this.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        address TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        model TEXT NOT NULL,
        isNew INTEGER NOT NULL CHECK (isNew IN (0, 1)),
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        paymentMethod INTEGER NOT NULL CHECK (paymentMethod IN (1, 2, 3, 4)),
        notes TEXT,
        profit REAL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 添加地址拆分字段（带错误处理，避免重复添加）
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN province TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN city TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN district TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN detailAddress TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN fullAddress TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      this.exec(`ALTER TABLE orders ADD COLUMN brand TEXT;`);
    } catch (error) {
      // 忽略重复列错误
      if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    // 插入初始品类数据
    const categories = ['冰箱', '洗衣机', '空调', '彩电', '热水器', '太阳能', '油烟机', '煤气灶', '净水机'];
    const stmt = this.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    categories.forEach(name => stmt.run(name));

    // 插入初始品牌数据
    const brands = [
      // 冰箱品牌 (category_id = 1)
      { name: '美的', category_id: 1 },
      { name: '海尔', category_id: 1 },
      { name: '志高', category_id: 1 },
      { name: 'AUX', category_id: 1 },
      { name: '海信', category_id: 1 },
      { name: '容声', category_id: 1 },
      // 洗衣机品牌 (category_id = 2)
      { name: '海尔', category_id: 2 },
      { name: '海信', category_id: 2 },
      { name: '小天鹅', category_id: 2 },
      { name: 'AUX', category_id: 2 },
      // 空调品牌 (category_id = 3)
      { name: '格力', category_id: 3 },
      { name: '美的', category_id: 3 },
      { name: '海尔', category_id: 3 },
      { name: 'TCL', category_id: 3 },
      { name: '卡萨帝', category_id: 3 },
      { name: '海信', category_id: 3 },
      // 彩电品牌 (category_id = 4)
      { name: '海信', category_id: 4 },
      { name: '乐华', category_id: 4 },
      { name: 'TCL', category_id: 4 },
      { name: '创维', category_id: 4 },
      // 热水器 (category_id = 5)
      { name: '海尔', category_id: 5 },
      { name: '德恩特', category_id: 5 },
      { name: '卡萨帝', category_id: 5 },
      { name: '美的', category_id: 5 },
      { name: '统帅', category_id: 5 },
      { name: '沐克', category_id: 5 },
      // 太阳能 (category_id = 6)
      { name: '清华紫光', category_id: 6 },
      // 油烟机品牌 (category_id = 7)
      { name: '太太美', category_id: 7 },
      { name: '迅达', category_id: 7 },
      // 煤气灶品牌 (category_id = 8)
      { name: '老板', category_id: 8 },
      { name: '太太美', category_id: 8 },
      { name: '知心好太太', category_id: 8 },
      { name: '迅达', category_id: 8 },
      { name: '海尔', category_id: 8 },
      // 净水机 (category_id = 9)
      { name: '海尔', category_id: 9 },
      { name: '美的', category_id: 9 },
      { name: '安吉尔', category_id: 9 }
    ];
    const brandStmt = this.prepare('INSERT OR IGNORE INTO brands (name, category_id) VALUES (?, ?)');
    brands.forEach(brand => brandStmt.run(brand.name, brand.category_id));

    // 已在CREATE TABLE中定义所有字段，无需额外添加
    // 移除重复的ALTER TABLE语句以避免错误

    // 创建用户表
    this.exec(`
      CREATE TABLE IF NOT EXISTS user_active_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, token)
      );
    `);

    // 创建token黑名单表
    this.exec(`
      CREATE TABLE IF NOT EXISTS invalidated_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // 创建客户表
    this.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT NOT NULL,
        phoneNumber TEXT NOT NULL UNIQUE,
        address TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 从订单表导入初始客户数据
    this.exec(`
      INSERT OR IGNORE INTO customers (customerName, phoneNumber, address)
      SELECT DISTINCT customerName, phoneNumber, address FROM orders;
    `);

    // 创建品类表
    this.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`);
  }

  /** 启用外键约束 */
  private enableForeignKeys(): void {
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  /**
   * 执行SQL语句
   * @param sql SQL语句
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * 准备SQL语句
   * @param sql SQL语句
   * @returns 预编译语句对象
   */
  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  /**
   * 获取数据库实例
   * @returns SQLite数据库实例
   */
  getInstance(): Database.Database {
    return this.db;
  }

  /** 关闭数据库连接 */
  close(): void {
    this.db.close();
  }
}

// 导出单例实例
export default new SqliteDatabase();