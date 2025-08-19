import db from '../db';
import { Customer, CustomerQuery, CustomerListResponse } from '../models/customer';
import { Workbook } from 'exceljs';

// 获取客户列表服务
export const getCustomersService = async (query: CustomerQuery): Promise<CustomerListResponse> => {

  const { customerName, address, phoneNumber, current = '1', pageSize = '10' } = query;

  // 验证分页参数
  const currentNum = parseInt(current, 10) || 1;
  const pageSizeNum = parseInt(pageSize, 10) || 10;
  const offset = (currentNum - 1) * pageSizeNum;

  // 构建查询条件
  const conditions: string[] = [];
  const params: any[] = [];

  if (customerName) {
    conditions.push('c.customerName LIKE ?');
    params.push(`%${customerName}%`);
  }

  if (address) {
    conditions.push('c.address LIKE ?');
    params.push(`%${address}%`);
  }

  if (phoneNumber) {
    conditions.push('c.phoneNumber LIKE ?');
    params.push(`%${phoneNumber}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  // 查询总记录数
  const countSql = `
    SELECT COUNT(*) as total
    FROM customers c
    LEFT JOIN orders o ON c.phoneNumber = o.phoneNumber
    ${whereClause}
    GROUP BY c.id
  `;
  const totalResult = db.prepare(countSql).all(...countParams) as Array<{ total: number }>;
  const total = totalResult.length;

  // 查询客户列表
  const sql = `
    SELECT 
      c.id, 
      c.customerName, 
      c.phoneNumber, 
      c.address, 
      c.createdAt, 
      c.updatedAt, 
      COUNT(o.id) as purchaseCount, 
      MIN(o.price) as minPrice, 
      MAX(o.price) as maxPrice 
    FROM customers c
    LEFT JOIN orders o ON c.phoneNumber = o.phoneNumber
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  params.push(pageSizeNum, offset);
  const customers = db.prepare(sql).all(...params) as Customer[];

  // 格式化购买力字段
  const formattedCustomers = customers.map(customer => ({
    customerId: customer.id,
    customerName: customer.customerName,
    phoneNumber: customer.phoneNumber,
    address: customer.address,
    purchasePower: customer.purchaseCount > 0
      ? `${customer.minPrice || 0} ~ ${customer.maxPrice || 0}`
      : '暂无购买记录',
    purchaseCount: customer.purchaseCount,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  }));

  return {
    list: formattedCustomers,
    pagination: {
      total,
      current: currentNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    }
  };
}

// 导出客户列表服务
export const exportCustomersService = async (): Promise<{ buffer: Buffer; fileName: string }> => {
  // 查询所有客户数据
  const sql = `
    SELECT 
      c.id, 
      c.customerName, 
      c.phoneNumber, 
      c.address, 
      c.createdAt, 
      c.updatedAt, 
      COUNT(o.id) as purchaseCount, 
      MIN(o.price) as minPrice, 
      MAX(o.price) as maxPrice 
    FROM customers c
    LEFT JOIN orders o ON c.phoneNumber = o.phoneNumber
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `;

  const customers = db.prepare(sql).all() as Customer[];

  // 格式化客户数据
  const formattedCustomers = customers.map(customer => ({
    customerId: customer.id,
    customerName: customer.customerName,
    phoneNumber: customer.phoneNumber,
    address: customer.address,
    purchasePower: customer.purchaseCount > 0
      ? `${customer.minPrice || 0} ~ ${customer.maxPrice || 0}`
      : '暂无购买记录',
    purchaseCount: customer.purchaseCount,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  }));

  // 生成文件名
  const today = new Date().toISOString().split('T')[0];
  const fileName = `${today} 客户列表.xlsx`;

  // 创建Excel工作簿
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('客户列表');

  // 定义表头
  worksheet.columns = [
    { header: '客户ID', key: 'customerId', width: 10 },
    { header: '客户姓名', key: 'customerName', width: 15 },
    { header: '联系电话', key: 'phoneNumber', width: 15 },
    { header: '详细地址', key: 'address', width: 50 },
    { header: '购买力', key: 'purchasePower', width: 15 },
    { header: '购买次数', key: 'purchaseCount', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
    { header: '更新时间', key: 'updatedAt', width: 20 },
  ];

  // 添加数据行
  formattedCustomers.forEach(customer => {
    worksheet.addRow({
      customerId: customer.customerId,
      customerName: customer.customerName,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      purchasePower: customer.purchasePower,
      purchaseCount: customer.purchaseCount,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  });

  // 生成Excel缓冲区
  const buffer = await workbook.xlsx.writeBuffer() as Buffer;
  return { buffer, fileName };
};