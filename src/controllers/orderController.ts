import { Context } from 'koa';
import { successResponse, errorResponse, ResponseCode } from '../utils/response';
import { OrderQuery, CreateOrderRequest, UpdateOrderRequest } from '../models/order';
import {
  createOrderService,
  getOrdersService,
  deleteOrderService,
  getOrderDetailService,
  updateOrderService,
  exportOrdersService
} from '../services/orderService';

/**
 * 创建新订单接口
 * @route POST /api/orders
 * @description 创建新的订单记录，返回创建的订单详情
 * @requestBody {
 *   customerName: string,        // 客户姓名（必填）
 *   phoneNumber: string,     // 客户电话（必填）
 *   province: {              // 省份信息（必填）
 *     label: string,         // 省份名称
 *     value: string,         // 省份编码
 *     key: string            // 省份键值
 *   },
 *   city: {                  // 城市信息（必填）
 *     label: string,         // 城市名称
 *     value: string,         // 城市编码
 *     key: string            // 城市键值
 *   },
 *   district: {              // 区县信息（必填）
 *     label: string,         // 区县名称
 *     value: string,         // 区县编码
 *     key: string            // 区县键值
 *   },
 *   detailAddress: string,   // 详细地址（必填）
 *   category_id?: number,    // 产品品类ID（选填，默认取第一个品类）
 *   model: string,           // 产品型号（必填）
 *   isNew: 0 | 1,            // 是否换新：0-否，1-是（必填）
 *   price: number,           // 单价（必填，单位：元）
 *   quantity: number,        // 数量（必填）
 *   paymentMethod: 1 | 2 | 3 | 4 | 5,  // 付款方式（必填）：1-现金，2-微信，3-支付宝，4-农商银行，5-其它
 *   notes?: string,          // 备注信息（选填）
 *   profit?: number,         // 利润（选填，单位：元，预留字段）
 *   purchaseTime: string     // 购买时间（必填，ISO格式，如：2025-08-18T11:41:15.800Z）
 * }
 * @response {
 *   code: number,            // 状态码：201-成功，400-参数错误，404-品类不存在，500-服务器错误
 *   message: string,         // 响应消息
 *   data: {
     id: number             // 订单ID
   }
* }
 */
export const createOrder = async (ctx: Context) => {
  try {
    const orderData = ctx.request.body as CreateOrderRequest;
    const newOrder = await createOrderService(orderData);
    // 简化返回数据，只包含订单ID和成功信息
    successResponse(ctx, { id: newOrder.id }, '订单创建成功', ResponseCode.CREATED);
  } catch (error) {
    errorResponse(ctx, '创建订单失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * 获取订单列表接口
 * @route GET /api/orders
 * @description 查询订单列表，支持条件过滤和分页
 * @query {
 *   startDate?: string,      // 开始日期（格式YYYY-MM-DD，筛选createdAt >= startDate）
 *   endDate?: string,        // 结束日期（格式YYYY-MM-DD，筛选createdAt <= endDate）
 *   customerName?: string,       // 客户姓名（模糊匹配）
 *   phoneNumber?: string,    // 客户电话（模糊匹配）
 *   address?: string,        // 客户地址（模糊匹配）
 *   category_id?: string,    // 产品品类ID（精确匹配）
 *   model?: string,          // 产品型号（精确匹配）
 *   current?: string,        // 页码（默认1）
 *   pageSize?: string,       // 每页条数（默认10）
 *   noPagination?: boolean   // 是否不需要分页：true-不分页返回所有结果，false-分页（默认false）
 * }
 * @response {
 *   code: number,            // 状态码：200-成功，500-服务器错误
 *   message: string,         // 响应消息
 *   data: {
 *       list: Array<{
 *       orderId: order.id,
 *       customerName: order.customerName,
 *       productName: order.productName,
 *       amount: order.amount,
 *       price: order.price,
 *       status: order.status,
 *       createdAt: order.createdAt,
 *       updatedAt: order.updatedAt,
 *       purchaseTime: order.purchaseTime
 *     }),
 *     pagination: {
 *       total: number,       // 总记录数
 *       page: number,        // 当前页码
 *       limit: number,       // 每页条数
 *       totalPages: number   // 总页数
 *     }
 *   }
 * }
 */
export const getOrders = async (ctx: Context) => {
  try {
    const queryParams = ctx.query as OrderQuery;
    const result = await getOrdersService(queryParams);
    successResponse(ctx, result, '获取订单列表成功');
  } catch (error) {
    errorResponse(ctx, '获取订单列表失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });

  }
};

/**
 * 删除订单接口
 * @route DELETE /api/orders/:id
 * @description 根据ID删除订单记录
 * @urlParams {number} id - 订单ID（必填）
 * @response {
 *   code: number,            // 状态码：200-成功，400-参数错误，404-订单不存在，500-服务器错误
 *   message: string          // 响应消息
 * }
 */
export const deleteOrder = async (ctx: Context) => {
  try {
    const orderId = parseInt(ctx.params.id, 10);
    if (isNaN(orderId)) {
      errorResponse(ctx, '无效的订单ID', ResponseCode.BAD_REQUEST);
      return;
    }

    const deleted = await deleteOrderService(orderId);
    if (!deleted) {
      errorResponse(ctx, '订单不存在或已被删除', ResponseCode.NOT_FOUND);
      return;
    }

    successResponse(ctx, null, '订单删除成功');
  } catch (error) {
    console.error('删除订单失败:', error);
    errorResponse(ctx, '服务器错误，删除订单失败');

  }
};

/**
 * 获取订单详情接口
 * @route GET /api/orders/:id
 * @description 通过订单ID获取订单详细信息
 * @params {number} id - 订单ID（路径参数，必填）
 * @response {
 *   code: number,            // 状态码：200-成功，400-参数错误，404-订单不存在，500-服务器错误
 *   message: string,         // 响应消息
 *   data: {
 *     id: number,            // 订单ID
 *     username: string,      // 客户姓名
 *     phoneNumber: string,   // 客户电话
 *     address: string,       // 客户地址
 *     category_id: number,   // 产品品类ID
 *     category_name: string, // 产品品类名称
 *     model: string,         // 产品型号
 *     isNew: 0 | 1,          // 是否换新
 *     price: number,         // 单价
 *     quantity: number,      // 数量
 *     paymentMethod: number, // 付款方式
 *     notes: string,         // 备注信息
 *     profit: number,        // 利润
 *     createdAt: string,     // 创建时间
 *     updatedAt: string,     // 更新时间
 *     purchaseTime: string   // 购买时间（ISO格式）
 *   }
 * }
 */
export const getOrderDetail = async (ctx: Context) => {
  try {
    const { id } = ctx.params;
    if (!id || isNaN(Number(id))) {
      errorResponse(ctx, '订单ID必须为有效的数字', ResponseCode.BAD_REQUEST);
      return;
    }

    const orderId = parseInt(id, 10);
    const order = await getOrderDetailService(orderId);
    successResponse(ctx, order, '获取订单详情成功');
  } catch (error) {
    errorResponse(ctx, '获取订单详情失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });

  }
};

/**
 * 更新订单接口
 * @route PUT /api/orders/:id
 * @description 通过订单ID更新订单信息
 * @params {number} id - 订单ID（路径参数，必填）
 * @requestBody {
 *   username?: string,       // 客户姓名（选填）
 *   phoneNumber?: string,    // 客户电话（选填）
 *   address?: string,        // 客户地址（选填）
 *   category_id?: number,    // 产品品类ID（选填）
 *   model?: string,          // 产品型号（选填）
 *   isNew?: 0 | 1,           // 是否换新：0-否，1-是（选填）
 *   price?: number,          // 单价（选填，单位：元）
 *   quantity?: number,       // 数量（选填）
 *   paymentMethod?: 1 | 2 | 3 | 4 | 5,  // 付款方式（选填）：1-现金，2-微信，3-支付宝，4-农商银行，5-其它
 *   notes?: string,          // 备注信息（选填）
 *   profit?: number,         // 利润（选填，单位：元）
 *   purchaseTime?: string    // 购买时间（选填，ISO格式时间字符串）
 * }
 * @response {
 *   code: number,            // 状态码：200-成功，400-参数错误，404-订单不存在，500-服务器错误
 *   message: string,         // 响应消息
 *   data: {
 *     id: number,            // 订单ID
 *     username: string,      // 客户姓名
 *     phoneNumber: string,   // 客户电话
 *     address: string,       // 客户地址
 *     category_id: number,   // 产品品类ID
 *     category_name: string, // 产品品类名称
 *     model: string,         // 产品型号
 *     isNew: 0 | 1,          // 是否换新
 *     price: number,         // 单价
 *     quantity: number,      // 数量
 *     paymentMethod: number, // 付款方式
 *     notes: string,         // 备注信息
 *     profit: number,        // 利润
 *     createdAt: string,     // 创建时间
 *     updatedAt: string,     // 更新时间
 *     purchaseTime: string   // 购买时间（ISO格式）
 *   }
 * }
 */
export const updateOrder = async (ctx: Context) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body as UpdateOrderRequest;

    if (!id || isNaN(Number(id))) {
      errorResponse(ctx, '订单ID必须为有效的数字', ResponseCode.BAD_REQUEST);
      return;
    }
    const orderId = parseInt(id, 10);

    const updatedOrder = await updateOrderService(orderId, updateData);
    successResponse(ctx, updatedOrder, '订单更新成功');
  } catch (error) {
    errorResponse(ctx, '更新订单失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 导出订单列表为Excel文件
 * @route GET /api/orders/export
 * @description 导出符合条件的订单列表为Excel文件
 * @query {
 *   startDate?: string,      // 开始日期（格式YYYY-MM-DD，筛选createdAt >= startDate）
 *   endDate?: string         // 结束日期（格式YYYY-MM-DD，筛选createdAt <= endDate）
 * }
 * @response 二进制Excel文件流
 */
export const exportOrders = async (ctx: Context) => {
  try {
    const { startDate, endDate } = ctx.query as { startDate?: string; endDate?: string };
    const { buffer, fileName } = await exportOrdersService({ startDate, endDate });

    // 设置响应头
    ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    ctx.body = buffer;
    ctx.status = 200;
  } catch (error) {
    errorResponse(ctx, '导出订单失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};