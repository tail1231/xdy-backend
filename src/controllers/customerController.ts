import { Context } from 'koa';
import db from '../db';
import { successResponse, errorResponse, ResponseCode } from '../utils/response';

import { CustomerQuery, CustomerListResponse } from '../models/customer';
import { getCustomersService, exportCustomersService } from '../services/customerService';

/**
 * 获取客户列表接口
 * @route GET /api/customers
 * @description 查询客户列表，包含购买力和购买次数统计，支持分页和客户姓名查询
 * @query {
 *   customerName?: string,    // 客户姓名（模糊匹配）
 *   current?: string,     // 页码（默认1）
 *   pageSize?: string     // 每页条数（默认10）
 * }
 * @response {
 *   code: number,
 *   message: string,
 *   data: {
 *     list: Array<{
 *       id: number,
 *       customerName: string,
 *       phoneNumber: string,
 *       address: string,
 *       purchasePower: string,
 *       purchaseCount: number,
 *       createdAt: string,
 *       updatedAt: string
 *     }>,
 *     pagination: {
 *       total: number,
 *       current: number,
 *       pageSize: number,
 *       totalPages: number
 *     }
 *   }
 * }
 */
export const getCustomers = async (ctx: Context) => {
  try {
    const queryParams = ctx.query as CustomerQuery;
    const result = await getCustomersService(queryParams);
    successResponse(ctx, result, '获取客户列表成功');
  } catch (error) {
    errorResponse(ctx, '获取客户列表失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 导出客户列表接口
 * @route GET /api/customers/export
 * @description 导出客户列表为Excel文件
 * @response 文件下载
 */
export const exportCustomers = async (ctx: Context) => {
  try {
    const result = await exportCustomersService();
    const { buffer, fileName } = result;

    ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ctx.set('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    ctx.body = buffer;
  } catch (error) {
    errorResponse(ctx, '导出客户列表失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};