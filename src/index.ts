// 加载环境变量
require('dotenv').config();
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import orderRoutes from './routes/orderRoutes';
import commonRoutes from './routes/commonRoutes';
import userRoutes from './routes/userRoutes';
import customerRoutes from './routes/customerRoutes';

const app = new Koa();

// 使用bodyparser中间件
app.use(bodyParser());

// 使用订单路由
app.use(commonRoutes.routes()).use(commonRoutes.allowedMethods());
app.use(orderRoutes.routes()).use(orderRoutes.allowedMethods());
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(customerRoutes.routes()).use(customerRoutes.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;