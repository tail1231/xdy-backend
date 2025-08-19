import Router from "@koa/router";
import { getCustomers, exportCustomers } from '../controllers/customerController';
import authMiddleware from '../middlewares/authMiddleware';

const router = new Router({
  prefix: '/api/customers'
});

// 获取客户列表 - 需要认证
router.get('/', authMiddleware, getCustomers);

// 导出客户列表 - 需要认证
router.get('/export', authMiddleware, exportCustomers);

export default router;