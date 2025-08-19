import Router from '@koa/router';
import { getPublicData, getMenu, getBrandsByCategoryId } from '../controllers/commonController';
import authMiddleware from '../middlewares/authMiddleware';

const router = new Router();

router.use(authMiddleware);

/**
 * 公共数据路由
 * @route GET /api/public-data - 获取所有公共选项数据
 */
router.get('/api/public-data', getPublicData);
router.get('/api/menu', getMenu);

/**
 * 品牌相关路由
 * @route GET /api/brands/:categoryId - 根据品类ID获取品牌列表
 */
router.get('/api/brands/:categoryId', getBrandsByCategoryId);

export default router;