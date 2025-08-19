import { Context } from 'koa';

/**
 * 响应状态码枚举
 */
export enum ResponseCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * 统一响应格式
 * @param ctx Koa上下文
 * @param code 状态码
 * @param message 消息
 * @param data 数据
 */
export const sendResponse = (
  ctx: Context,
  statusCode: ResponseCode,
  message: string,
  data: any = null,
  errorCode?: string
) => {
  ctx.status = statusCode;
  ctx.body = {
    code: errorCode || statusCode,
    message,
    data
  };
};

/**
 * 成功响应
 * @param ctx Koa上下文
 * @param data 数据
 * @param message 消息
 * @param code 状态码 (默认200)
 */
export const successResponse = (
  ctx: Context,
  data: any = null,
  message = '操作成功',
  code: ResponseCode = ResponseCode.SUCCESS
) => {
  sendResponse(ctx, code, message, data);
};

/**
 * 错误响应
 * @param ctx Koa上下文
 * @param message 错误消息
 * @param code 状态码 (默认500)
 * @param data 附加数据
 */
export const errorResponse = (
  ctx: Context,
  message = '操作失败',
  code: ResponseCode = ResponseCode.INTERNAL_SERVER_ERROR,
  data: any = null,
  errorCode?: string
) => {
  sendResponse(ctx, code, message, data, errorCode);
};