import { Context } from 'koa';

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  username: string;
  password: string;
}

/**
 * 用户注册请求参数接口
 */
export interface RegisterRequest {
  username: string;
  password: string;
}

/**
 * 用户登录请求参数接口
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 修改密码请求参数接口
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 用户登录响应接口
 */
export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
}

/**
 * 注册响应接口
 */
export interface RegisterResponse {
  userId: number;
  username: string;
}