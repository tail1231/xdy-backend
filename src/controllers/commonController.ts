import { Context } from 'koa';
import { successResponse, errorResponse, ResponseCode } from '../utils/response';
import { getPublicDataService, getMenuService, getBrandsByCategoryIdService } from '../services/commonService';

/**
 * 获取公共数据接口
 * @route GET /api/public-data
 * @returns {Object} 包含各类公共数据的对象
 */
export const getPublicData = async (ctx: Context) => {
  try {
    const data = await getPublicDataService();
    successResponse(ctx, data, '获取公共数据成功');
  } catch (error) {
    errorResponse(ctx, '获取公共数据失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 根据品类ID获取品牌接口
 * @route GET /api/brands/:categoryId
 * @param {number} categoryId - 品类ID
 * @returns {Array} 品牌列表
 */
export const getBrandsByCategoryId = async (ctx: Context) => {
  try {
    const { categoryId } = ctx.params;
    if (!categoryId || isNaN(Number(categoryId))) {
      return errorResponse(ctx, '无效的品类ID', ResponseCode.BAD_REQUEST);
    }
    const brands = await getBrandsByCategoryIdService(Number(categoryId));
    successResponse(ctx, brands, '获取品牌列表成功');
  } catch (error) {
    errorResponse(ctx, '获取品牌列表失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
/**
 * 获取菜单和权限接口
 * @route GET /api/menu
 * @returns {Object} 包含菜单和权限信息
 */
export const getMenu = async (ctx: Context) => {
  try {
    const { menus, permissions } = await getMenuService();
    successResponse(ctx, {
      menus,
      permissions
    }, '获取菜单成功');
  } catch (error) {
    errorResponse(ctx, '获取菜单失败', ResponseCode.INTERNAL_SERVER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};