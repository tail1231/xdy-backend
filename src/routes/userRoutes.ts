import Router from '@koa/router';
import { register, login, logout, changePassword } from '../controllers/userController';
import authMiddleware from '../middlewares/authMiddleware';

const router = new Router({ prefix: '/api/auth' });

/**
 * 用户注册接口
 * @route POST /api/auth/register
 */
router.post('/register', register);

/**
 * 用户登录接口
 * @route POST /api/auth/login
 */
router.post('/login', login);

/**
 * 用户退出登录接口
 * @route POST /api/auth/logout
 */
router.post('/logout', logout);

router.post('/change-password', authMiddleware, changePassword);

export default router;