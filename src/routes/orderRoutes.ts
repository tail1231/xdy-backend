import Router from "@koa/router";
import authMiddleware from '../middlewares/authMiddleware';
import {
  createOrder,
  getOrders,
  getOrderDetail,
  updateOrder,
  deleteOrder,
  exportOrders
} from "../controllers/orderController";

const router = new Router({ prefix: "/api/orders" });

router.use(authMiddleware);

// 获取订单列表（支持查询和分页）
router.get("/", getOrders);

// 导出订单为Excel
router.get("/export", exportOrders);

// 获取订单详情
router.get("/:id", getOrderDetail);

// 更新订单详情
router.put("/:id", updateOrder);

// 创建新订单
router.post("/", createOrder);

// 删除订单
router.delete("/:id", deleteOrder);

export default router;
