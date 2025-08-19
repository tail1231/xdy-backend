import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import db from '../db';
import { RegisterRequest, LoginRequest, ChangePasswordRequest, LoginResponse, RegisterResponse } from '../models/user';

/**
 * 用户注册服务
 */
export const registerService = async (userData: RegisterRequest): Promise<RegisterResponse> => {
  // 检查用户名是否已存在
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
  if (existingUser) {
    throw new Error('USER_001');
  }

  // 密码加密 (10轮盐值)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

  // 插入新用户
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO users (username, password, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run(
    userData.username,
    hashedPassword,
    now,
    now
  );

  return {
    userId: Number(result.lastInsertRowid),
    username: userData.username
  };
};

/**
 * 用户登录服务
 */
export const loginService = async (loginData: LoginRequest): Promise<LoginResponse> => {
  // 查询用户
  const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(loginData.username) as { id: number; username: string; password: string } | undefined;
  if (!user) {
    throw new Error('USER_002');
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
  if (!isPasswordValid) {
    throw new Error('USER_002');
  }

  // 验证JWT密钥
  const jwtSecret = process.env.JWT_SECRET as Secret;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET_UNDEFINED');
  }

  // 生成JWT令牌
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as SignOptions
  );

  // 删除用户之前的所有活跃token
  db.prepare('DELETE FROM user_active_tokens WHERE user_id = ?').run(user.id);
  // 插入新的活跃token
  db.prepare('INSERT INTO user_active_tokens (user_id, token) VALUES (?, ?)').run(user.id, token);

  return {
    token,
    userId: user.id,
    username: user.username
  };
};

/**
 * 用户登出服务
 */
export const logoutService = async (token: string): Promise<void> => {
  try {
    // 验证token并获取过期时间
    const decoded = jwt.verify(token, process.env.JWT_SECRET as Secret) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    // 将token加入黑名单
    await db.prepare('INSERT INTO invalidated_tokens (token, expires_at) VALUES (?, ?)').run(token, expiresAt);
  } catch (error) {
    throw new Error('INVALID_TOKEN');
  }
};

/**
 * 修改密码服务
 */
export const changePasswordService = async (userId: number, passwordData: ChangePasswordRequest): Promise<void> => {
  // 查询用户
  const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(userId) as { id: number; password: string } | undefined;
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // 验证当前密码
  const isCurrentPasswordValid = await bcrypt.compare(passwordData.currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new Error('INVALID_CURRENT_PASSWORD');
  }

  // 密码加密
  const saltRounds = 10;
  const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, saltRounds);

  // 更新密码
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?').run(hashedNewPassword, now, userId);

  // 使当前token失效
  db.prepare('DELETE FROM user_active_tokens WHERE user_id = ?').run(userId);
};