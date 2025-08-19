import { Context, Next } from 'koa';
import jwt, { Secret } from 'jsonwebtoken';
import db from '../db';
import dotenv from 'dotenv';
import { errorResponse, ResponseCode } from '../utils/response';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET as Secret;

export default async function authMiddleware(ctx: Context, next: Next) {
  try {
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(ctx, '未提供有效的token', ResponseCode.UNAUTHORIZED);
    return;
    }

    const token = authHeader.split(' ')[1];

    // 检查token是否已失效
    const invalidToken = db.prepare('SELECT * FROM invalidated_tokens WHERE token = ?').get(token);
    if (invalidToken) {
      errorResponse(ctx, 'token已失效', ResponseCode.UNAUTHORIZED, null, 'USER_003');
      return;
    }

    // 检查token是否为用户当前活跃token
    const activeToken = db.prepare('SELECT * FROM user_active_tokens WHERE token = ?').get(token);
    if (!activeToken) {
      errorResponse(ctx, 'token已失效', ResponseCode.UNAUTHORIZED, null, 'USER_003');
      return;
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    ctx.state.user = decoded;
    await next();
  } catch (error) {
    errorResponse(ctx, 'token无效或已过期', ResponseCode.UNAUTHORIZED, null, 'USER_003');
  }
}