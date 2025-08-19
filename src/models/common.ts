/**
 * 公共数据模型定义
 */

/**
 * 下拉选项模型
 */
export interface SelectOption {
  value: number | string;
  label: string;
}

/**
 * 品牌模型
 */
export interface Brand {
  id: number;
  name: string;
  category_id: number;
}

/**
 * 品牌选项模型
 */
export interface BrandOption {
  value: number;
  label: string;
}

/**
 * 公共数据响应模型
 */
export interface PublicDataResponse {
  isNewOptions: SelectOption[];
  paymentMethods: SelectOption[];
  categories: SelectOption[];
}

/**
 * 菜单项模型
 */
export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  hidden: boolean;
  children?: MenuItem[];
}

/**
 * 菜单响应模型
 */
export interface MenuResponse {
  menus: MenuItem[];
  permissions: string[];
}