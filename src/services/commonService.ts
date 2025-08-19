import db from '../db';
import { SelectOption, PublicDataResponse, MenuItem, MenuResponse, BrandOption } from '../models/common';

/**
 * 获取公共数据服务
 * @returns {Promise<PublicDataResponse>}
 */
/**
 * 获取公共数据服务
 * @returns {Promise<PublicDataResponse>}
 */
export const getPublicDataService = async (): Promise<PublicDataResponse> => {
  // 静态数据 - 是否换新选项
  const isNewOptions = [
    { value: 1, label: "是" },
    { value: 0, label: "否" },
  ];

  // 静态数据 - 付款方式选项
  const paymentMethods = [
    { value: 1, label: "现金" },
    { value: 2, label: "微信" },
    { value: 3, label: "支付宝" },
    { value: 4, label: "农商银行扫码" },
    { value: 5, label: "其它" },
  ];

  // 动态数据 - 从数据库获取品类
  const categories = await new Promise<any[]>((resolve, reject) => {
    try {
      const stmt = db.prepare('SELECT id AS value, name AS label FROM categories');
      const rows = stmt.all();
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });

  return { isNewOptions, paymentMethods, categories };
};

/**
 * 根据品类ID获取品牌服务
 * @param categoryId 品类ID
 * @returns {Promise<BrandOption[]>}
 */
export const getBrandsByCategoryIdService = async (categoryId: number): Promise<BrandOption[]> => {
  return new Promise<BrandOption[]>((resolve, reject) => {
    try {
      const stmt = db.prepare('SELECT id AS value, name AS label FROM brands WHERE category_id = ?');
      const rows = stmt.all(categoryId) as BrandOption[];
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 获取菜单和权限服务
 * @returns {Promise<MenuResponse>}
 */
export const getMenuService = async (): Promise<MenuResponse> => {
  const menus = [
    {
      key: '/dashboard',
      icon: 'DashboardOutlined',
      label: '仪表盘',
      hidden: false
    },
    {
      key: '/order-management',
      icon: 'ShoppingOutlined',
      label: '订单管理',
      hidden: false,
      children: [
        {
          key: '/order-management/order-list',
          icon: 'FileTextOutlined',
          label: '订单列表',
          hidden: false
        },
        {
          key: '/order-management/create-order',
          icon: 'PlusOutlined',
          label: '创建订单',
          hidden: false
        },
        {
          key: '/order-management/edit-order',
          icon: 'EditOutlined',
          label: '编辑订单',
          hidden: true
        },
        {
          key: '/order-management/order-detail',
          icon: 'EyeOutlined',
          label: '订单详情',
          hidden: true
        }
      ]
    },
    {
      key: '/customer-management',
      icon: 'ContactsOutlined',
      label: '客户管理',
      hidden: false,
      children: [
        {
          key: '/customer-management/customer-list',
          icon: 'CommentOutlined',
          label: '客户列表',
          hidden: false
        }
      ]
    },
    {
      key: '/inventory-management',
      icon: 'InboxOutlined',
      label: '库存管理',
      hidden: false,
      children: [
        {
          key: '/inventory-management/inventory-list',
          icon: 'FileTextOutlined',
          label: '库存列表',
          hidden: false
        },
        {
          key: '/inventory-management/edit-inventory',
          icon: 'EditOutlined',
          label: '编辑库存',
          hidden: false
        }
      ]
    }
  ];

  const permissions: string[] = [];

  return { menus, permissions };
};