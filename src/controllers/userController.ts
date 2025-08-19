import { Context } from 'koa';
import { successResponse, errorResponse, ResponseCode } from '../utils/response';
import { RegisterRequest, LoginRequest, ChangePasswordRequest } from '../models/user';
import {
  registerService,
  loginService,
  logoutService,
  changePasswordService
} from '../services/userService';

export const logout = async (ctx: Context) => {
  try {
    // 验证请求头中的token
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(ctx, '未提供token', ResponseCode.UNAUTHORIZED);
      return;
    }

    const token = authHeader.split(' ')[1];
    await logoutService(token);
    successResponse(ctx, null, '退出登录成功');
  } catch (error: any) {
    if (error.message === 'INVALID_TOKEN') {
      errorResponse(ctx, '无效的token', ResponseCode.UNAUTHORIZED);
      return;
    }
    errorResponse(ctx, '退出登录失败', ResponseCode.INTERNAL_SERVER_ERROR);
  }
}


/**
 * 用户注册接口
 * @route POST /api/auth/register
 */
export const register = async (ctx: any) => {
  try {
    const { username, password }: RegisterRequest = ctx.request.body;

    // 参数验证
    if (!username || !password) {
      errorResponse(ctx, '用户名和密码不能为空', ResponseCode.BAD_REQUEST);
      return;
    }

    const result = await registerService({ username, password });
    successResponse(ctx, result, '注册成功', ResponseCode.CREATED);
  } catch (error: any) {
    if (error.message === 'USER_001') {
      ctx.status = 401;
      ctx.body = { code: 'USER_001', message: '用户名已存在', data: null };
      return;
    }
    console.error('注册接口错误:', error);
    errorResponse(ctx, '服务器错误，注册失败');
  }
}




/**
 * 用户登录接口
 * @route POST /api/auth/login
 */
export const login = async (ctx: any) => {
  try {
    const { username, password }: LoginRequest = ctx.request.body;

    // 参数验证
    if (!username || !password) {
      errorResponse(ctx, '用户名和密码不能为空', ResponseCode.BAD_REQUEST);
      return;
    }

    const result = await loginService({ username, password });
    successResponse(ctx, result, '登录成功');
  } catch (error: any) {
    if (error.message === 'USER_002') {
      ctx.status = 401;
      ctx.body = { code: 'USER_002', message: '用户名或密码错误', data: null };
      return;
    } else if (error.message === 'JWT_SECRET_UNDEFINED') {
      errorResponse(ctx, '服务器配置错误，JWT密钥未定义', ResponseCode.INTERNAL_SERVER_ERROR);
      return;
    }
    console.error('登录接口错误:', error);
    errorResponse(ctx, '服务器错误，登录失败');
  }
};

export const changePassword = async (ctx: Context) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = ctx.request.body as ChangePasswordRequest;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      errorResponse(ctx, '所有密码字段均为必填项', ResponseCode.BAD_REQUEST);
      return;
    }

    if (newPassword !== confirmPassword) {
      errorResponse(ctx, '新密码与确认密码不匹配', ResponseCode.BAD_REQUEST);
      return;
    }

    // Get user from token
    const userId = ctx.state.user.userId;
    await changePasswordService(userId, { currentPassword, newPassword, confirmPassword });
    successResponse(ctx, null, '密码修改成功');
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      errorResponse(ctx, '用户不存在', ResponseCode.NOT_FOUND);
      return;
    } else if (error.message === 'INVALID_CURRENT_PASSWORD') {
      errorResponse(ctx, '当前密码不正确', ResponseCode.UNAUTHORIZED);
      return;
    }
    console.error('修改密码接口错误:', error);
    errorResponse(ctx, '服务器错误，修改密码失败');
  }
};