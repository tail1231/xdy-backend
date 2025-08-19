import db from '../db';
import { OrderQuery, CreateOrderRequest, UpdateOrderRequest, OrderListResponse, OrderDetailResponse } from '../models/order';
import { Workbook } from 'exceljs';

// 创建订单服务
export const createOrderService = async (orderData: CreateOrderRequest): Promise<OrderDetailResponse> => {
  // 处理地址字段默认值
  if (orderData.province === undefined && orderData.city === undefined && orderData.district === undefined) {
    orderData.province = {
      label: '江苏省',
      value: '320000',
      key: '320000'
    };
    orderData.city = {
      label: '无锡市',
      value: '320200',
      key: '320200'
    };
    orderData.district = {
      label: '江阴市',
      value: '320281',
      key: '320281'
    };
  }

  // 验证必填字段
  const requiredFields = ['customerName', 'phoneNumber', 'province', 'city', 'district', 'address', 'model', 'isNew', 'price', 'quantity', 'paymentMethod', 'purchaseTime'];
  const missingFields = requiredFields.filter(field => !(field in orderData));

  // 验证地址对象结构
  if (orderData.province && typeof orderData.province !== 'object') {
    throw new Error('province必须是对象类型');
  }
  if (orderData.city && typeof orderData.city !== 'object') {
    throw new Error('city必须是对象类型');
  }
  if (orderData.district && typeof orderData.district !== 'object') {
    throw new Error('district必须是对象类型');
  }

  // 验证地址对象中的label字段
  if (!orderData.province?.label) {
    throw new Error('province.label是必填字段');
  }
  if (!orderData.city?.label) {
    throw new Error('city.label是必填字段');
  }
  if (!orderData.district?.label) {
    throw new Error('district.label是必填字段');
  }
  if (missingFields.length > 0) {
    throw new Error(`缺少必填字段: ${missingFields.join(', ')}`);
  }

  // 自动设置默认品类ID
  if (!orderData.category_id) {
    const defaultCategory = db.prepare('SELECT id FROM categories LIMIT 1').get() as { id: number } | undefined;
    if (!defaultCategory) {
      throw new Error('系统错误：未找到默认产品品类');
    }
    orderData.category_id = defaultCategory.id;
  }

  // 验证品类是否存在
  const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(orderData.category_id);
  if (!category) {
    throw new Error('产品品类不存在');
  }

  // 处理品牌字段：如果传入的是品牌ID，则转换为品牌名称
  let brandName = orderData.brand || '';
  if (brandName && !isNaN(Number(brandName))) {
    const brandId = parseInt(brandName, 10);
    const brand = db.prepare('SELECT name FROM brands WHERE id = ?').get(brandId) as { name?: string };
    brandName = brand?.name || brandName;
  }

  // 提取地址信息
  const provinceLabel = orderData.province.label;
  const cityLabel = orderData.city.label;
  const districtLabel = orderData.district.label;
  // 拼接完整地址（省市区 + 用户输入的address）
  const fullAddress = `${provinceLabel} ${cityLabel} ${districtLabel} ${orderData.address}`;

  // 插入订单
  const insertSql = `
      INSERT INTO orders (
        customerName, phoneNumber, address, province, city, district, fullAddress, category_id, brand, model, isNew, 
        price, quantity, paymentMethod, notes, profit, purchaseTime, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
  const stmt = db.prepare(insertSql);
  const result = stmt.run(
    orderData.customerName,
    orderData.phoneNumber,
    fullAddress,  // address字段存储完整地址
    provinceLabel,
    cityLabel,
    districtLabel,
    fullAddress,
    orderData.category_id,
    brandName,
    orderData.model,
    orderData.isNew,
    orderData.price,
    orderData.quantity,
    orderData.paymentMethod,
    orderData.notes || '',
    orderData.profit || 0,
    orderData.purchaseTime
  );

  // 检查并更新客户信息
  const existingCustomer = db.prepare('SELECT id, customerName, address FROM customers WHERE phoneNumber = ?').get(orderData.phoneNumber) as { id: number; customerName: string; address: string } | undefined;
  if (!existingCustomer) {
    const insertCustomerSql = `
      INSERT INTO customers (customerName, phoneNumber, address, createdAt, updatedAt)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    db.prepare(insertCustomerSql).run(
      orderData.customerName,
      orderData.phoneNumber,
      fullAddress
    );
  } else if (existingCustomer.customerName !== orderData.customerName || existingCustomer.address !== fullAddress) {
    const updateCustomerSql = `
      UPDATE customers
      SET customerName = ?, address = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE phoneNumber = ?
    `;
    db.prepare(updateCustomerSql).run(
      orderData.customerName,
      fullAddress,
      orderData.phoneNumber
    );
  }

  // 获取新创建的订单
  const newOrder = db.prepare(`
    SELECT o.*, c.name as category_name, o.brand as brand 
    FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    WHERE o.id = ?
  `).get(result.lastInsertRowid) as OrderDetailResponse;

  return newOrder;
};

// 获取订单列表服务
export const getOrdersService = async (query: OrderQuery): Promise<OrderListResponse> => {
  const { 
    startDate, endDate, customerName, phoneNumber, 
    address, category_id, model, current = '1', pageSize = '10', noPagination = false
  } = query;

  // 处理和验证日期格式
  const parseDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // 检查是否是有效日期
      if (isNaN(date.getTime())) {
        throw new Error('无效的日期格式');
      }
      // 转换为YYYY-MM-DD格式
      return date.toISOString().split('T')[0];
    } catch (error) {
      throw new Error(`日期格式错误: ${dateString}，支持YYYY-MM-DD、ISO格式或GMT格式`);
    }
  };

  let formattedStartDate: string | undefined;
  let formattedEndDate: string | undefined;

  if (startDate) {
    formattedStartDate = parseDate(startDate);
  }
  if (endDate) {
    formattedEndDate = parseDate(endDate);
  }

  // 检查开始日期是否晚于结束日期
  if (formattedStartDate && formattedEndDate && new Date(formattedStartDate) > new Date(formattedEndDate)) {
    throw new Error('startDate不能晚于endDate');
  }

  // 确保查询包含结束日期的全天
  if (formattedEndDate) {
    // 如果开始日期和结束日期相同，或者只有结束日期，则将结束日期设置为当天的23:59:59
    formattedEndDate = `${formattedEndDate}T23:59:59.999Z`;
  }

  // 构建查询条件
  const conditions: string[] = [];
  const params: any[] = [];

  // 调试日志
  console.log('Formatted dates:', { formattedStartDate, formattedEndDate });
  console.log('Query parameters:', query);
  if (formattedStartDate) {
    conditions.push('o.purchaseTime >= ?');
    params.push(formattedStartDate);
  }

  if (formattedEndDate) {
    conditions.push('o.purchaseTime <= ?');
    params.push(formattedEndDate);
  }

  if (customerName) {
    conditions.push('o.customerName LIKE ?');
    params.push(`%${customerName}%`);
  }

  if (phoneNumber) {
    conditions.push('o.phoneNumber LIKE ?');
    params.push(`%${phoneNumber}%`);
  }

  // 移除了province、city、district和detailAddress字段的查询条件
  // 仅保留address字段进行整体地址查询


  if (address) {
    conditions.push('o.fullAddress LIKE ?');
    params.push(`%${address}%`);
  }

  if (category_id) {
    conditions.push('o.category_id = ?');
    params.push(parseInt(category_id, 10));
  }

  if (model) {
    conditions.push('o.model LIKE ?');
    params.push(`%${model}%`);
  }

  // 分页处理
  let currentNum = parseInt(current, 10) || 1;
  let pageSizeNum = parseInt(pageSize, 10) || 10;
  const countParams = [...params];

  // 如果不需要分页，则查询所有结果
  if (noPagination) {
    pageSizeNum = 0; // 0表示不限制数量
    currentNum = 1;
  }

  const offset = (currentNum - 1) * pageSizeNum;
  if (!noPagination) {
    params.push(pageSizeNum, offset);
  }

  // 构建SQL查询
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `
    SELECT COUNT(*) as total FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    ${whereClause}
  `;
  // 构建SELECT SQL，根据是否分页决定是否添加LIMIT和OFFSET
  const selectSql = noPagination ? `
    SELECT o.*, c.name as category_name, o.customerName as customerName, o.brand as brand
    FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    ${whereClause}
    ORDER BY o.createdAt DESC
  ` : `
    SELECT o.*, c.name as category_name, o.customerName as customerName, o.brand as brand
    FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    ${whereClause}
    ORDER BY o.createdAt DESC 
    LIMIT ? OFFSET ?
  `;

  // 执行查询
  const totalResult = db.prepare(countSql).get(...countParams) as { total: number } | null;
  const total = totalResult?.total ?? 0;
  const orders = noPagination ? db.prepare(selectSql).all(...countParams) : db.prepare(selectSql).all(...params);

  // 格式化响应数据
  // 构建返回结果
  const result: Partial<OrderListResponse> = {
    list: orders.map((order: any) => ({
      orderId: order.id,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      address: order.address,

      
      categoryId: order.category_id,
      categoryName: order.category_name,
      model: order.model,
      brand: order.brand || '',
      isNew: order.isNew,
      price: order.price,
      quantity: order.quantity,
      paymentMethod: { 1: '现金', 2: '微信', 3: '支付宝', 4: '农商银行', 5: '其它' }[order.paymentMethod as number] || order.paymentMethod,
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // 将UTC时间转换为当地时间后再提取日期
      purchaseTime: order.purchaseTime ? new Date(order.purchaseTime).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : ''
    }))
  };

  // 如果不需要分页，仍然返回pagination以保持接口兼容性，但值为null
  if (noPagination) {
    result.pagination = null;
  } else {
    result.pagination = {
      total,
      current: currentNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    };
  }

  return result as OrderListResponse;
};

// 为了保持类型一致性，建议在OrderQuery接口中添加noPagination字段
// interface OrderQuery {
//   startDate?: string;
//   endDate?: string;
//   customerName?: string;
//   phoneNumber?: string;
//   address?: string;
//   category_id?: string;
//   model?: string;
//   current?: string;
//   pageSize?: string;
//   noPagination?: boolean;
// }

// 删除订单服务
export const deleteOrderService = async (orderId: number): Promise<boolean> => {
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  const result = stmt.run([orderId]);
  return result.changes > 0;
};

// 获取订单详情服务
export const getOrderDetailService = async (orderId: number): Promise<OrderDetailResponse> => {
  const order = db.prepare(`
  SELECT o.*, c.name as category_name, o.brand as brand 
  FROM orders o
  LEFT JOIN categories c ON o.category_id = c.id
  WHERE o.id = ?
`).get(orderId) as any;

  if (!order) {
    throw new Error('订单不存在');
  }

  // 移除profit字段和不需要的地址字段
  const { profit, province, city, district, detailAddress, fullAddress, ...orderWithoutUnneededFields } = order;

  // 直接使用订单表中存储的完整地址
  const address = order.address;

  // 添加address字段和purchaseTime字段
  const result = {
    ...orderWithoutUnneededFields,
    address,
    category_name: order.category_name,
    brand: order.brand || '',
    // 将UTC时间转换为当地时间后再提取日期
    purchaseTime: order.purchaseTime ? new Date(order.purchaseTime).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : ''
  };

  return result as OrderDetailResponse;
};

// 更新订单服务
export const updateOrderService = async (orderId: number, updateData: UpdateOrderRequest): Promise<OrderDetailResponse> => {
  // 检查订单是否存在
  const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!existingOrder) {
    throw new Error('订单不存在');
  }

  // 验证更新字段
  if (updateData.isNew !== undefined && ![0, 1].includes(updateData.isNew)) {
    throw new Error('isNew必须为0或1');
  }

  if (updateData.paymentMethod !== undefined && ![1, 2, 3, 4, 5].includes(updateData.paymentMethod)) {
    throw new Error('paymentMethod必须为1、2、3、4或5');
  }

  // 处理品牌字段：如果传入的是品牌ID，则转换为品牌名称
  let brandName = updateData.brand;
  if (brandName !== undefined && !isNaN(Number(brandName))) {
    const brandId = parseInt(brandName as string, 10);
    const brand = db.prepare('SELECT name FROM brands WHERE id = ?').get(brandId) as { name?: string };
    brandName = brand?.name || brandName;
  }

  // 构建动态更新SQL
  const updates: string[] = [];
  const params: any[] = [];
  // 添加brand字段到允许更新的字段列表
  // 暂时使用字符串数组代替keyof类型，解决编译错误
  // 修正字段名：将username改为customerName
  const allowedFields: string[] = ['customerName', 'phoneNumber', 'address', 'category_id', 'model', 'isNew', 'price', 'quantity', 'paymentMethod', 'notes', 'profit', 'purchaseTime'];

  // 手动处理brand字段
  if (brandName !== undefined) {
    updates.push('brand = ?');
    params.push(brandName);
  }

  allowedFields.forEach(field => {
    // 使用类型断言解决索引类型错误
    if ((updateData as any)[field] !== undefined) {
      if (field === 'purchaseTime') {
        // 处理purchaseTime字段，确保正确的日期格式（去除时区影响）
        const purchaseTime = (updateData as any)[field];
        if (purchaseTime && typeof purchaseTime === 'string') {
          // 如果包含时区信息，转换为当地日期
          const date = new Date(purchaseTime);
          // 获取当地日期的年、月、日
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          // 格式化为YYYY-MM-DD
          const formattedDate = `${year}-${month}-${day}`;
          updates.push(`${field} = ?`);
          params.push(formattedDate);
        } else {
          updates.push(`${field} = ?`);
          params.push(purchaseTime);
        }
      } else {
        updates.push(`${field} = ?`);
        params.push((updateData as any)[field]);
      }
    }
  });

  if (updates.length === 0) {
    throw new Error('没有需要更新的字段');
  }

  // 添加更新时间
  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(orderId);

  // 执行更新
  const updateSql = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(updateSql).run(...params);

  // 获取更新后的订单
  const updatedOrder = db.prepare(`
    SELECT o.*, c.name as category_name, o.brand as brand
    FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    WHERE o.id = ?
  `).get(orderId) as OrderDetailResponse;

  return updatedOrder;
};

// 导出订单服务
export const exportOrdersService = async (query: { startDate?: string; endDate?: string }): Promise<{ buffer: Buffer; fileName: string }> => {
  const { startDate, endDate } = query;

  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !dateRegex.test(startDate)) {
    throw new Error('startDate格式错误，应为YYYY-MM-DD');
  }
  if (endDate && !dateRegex.test(endDate)) {
    throw new Error('endDate格式错误，应为YYYY-MM-DD');
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new Error('startDate不能晚于endDate');
  }

  // 构建查询条件
  const conditions: string[] = [];
  const params: any[] = [];
  if (startDate) {
    conditions.push('o.purchaseTime >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('o.purchaseTime <= ?');
    params.push(endDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查询订单数据
  const selectSql = `
    SELECT o.*, c.name as category_name, o.customerName as customerName, o.brand as brand
    FROM orders o
    LEFT JOIN categories c ON o.category_id = c.id
    ${whereClause}
    ORDER BY o.createdAt DESC
  `;

  const orders = db.prepare(selectSql).all(...params);

  // 处理文件名日期范围
  let fileNameStart = startDate;
  let fileNameEnd = endDate;

  if (!startDate || !endDate) {
    const dateRangeSql = `
      SELECT MIN(createdAt) as minDate, MAX(createdAt) as maxDate
      FROM orders o
      ${whereClause}
    `;
    const dateRange = db.prepare(dateRangeSql).get(...params) as { minDate: string; maxDate: string };

    if (!fileNameStart) fileNameStart = dateRange.minDate ? new Date(dateRange.minDate).toISOString().split('T')[0] : '';
    if (!fileNameEnd) fileNameEnd = dateRange.maxDate ? new Date(dateRange.maxDate).toISOString().split('T')[0] : '';
  }

  // 默认日期处理
  const today = new Date().toISOString().split('T')[0];
  fileNameStart = fileNameStart || today;
  fileNameEnd = fileNameEnd || today;
  const fileName = `${fileNameStart}~${fileNameEnd} 订单明细.xlsx`;

  // 创建Excel工作簿
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('订单明细');

  // 设置打印选项
  worksheet.pageSetup.orientation = 'landscape'; // 横向打印
  worksheet.pageSetup.fitToPage = true; // 启用适应页面
  worksheet.pageSetup.fitToWidth = 1; // 适应到1页宽
  worksheet.pageSetup.fitToHeight = 0; // 高度不限制
  worksheet.pageSetup.margins = { top: 0.7, right: 0.7, bottom: 0.7, left: 0.7, header: 0.3, footer: 0.3 }; // 设置页边距

  // 定义表头
  worksheet.columns = [
    { header: '客户姓名', key: 'customerName', width: 15 },
    { header: '客户电话', key: 'phoneNumber', width: 15 },
    { header: '详细地址', key: 'address', width: 50 },
    { header: '产品品类', key: 'categoryName', width: 15 },
    { header: '品牌', key: 'brand', width: 15 },
    { header: '产品型号', key: 'model', width: 20 },
    { header: '是否换新', key: 'isNew', width: 10 },
    { header: '单价', key: 'price', width: 10 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '付款方式', key: 'paymentMethod', width: 15 },
    { header: '备注', key: 'notes', width: 30 },
    { header: '利润', key: 'profit', width: 10 },
    { header: '购买时间', key: 'purchaseTime', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 20 },
    { header: '更新时间', key: 'updatedAt', width: 20 },
  ];

  // 设置表头样式：加粗、居中、增大字号
  worksheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 设置表头行高
  worksheet.getRow(1).height = 28; // 增加行高

  // 添加数据行并设置样式
  orders.forEach((order: any, index: number) => {
    const model = order.model || '';
    const profitMatch = model.match(/\/(\d+)$/);
    const profitValue = profitMatch ? parseInt(profitMatch[1], 10) : 0;
    // 使用订单中的address字段
    const address = order.address || '';

    const row = worksheet.addRow({
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      address: address,
      categoryName: order.category_name,
      brand: order.brand || '',
      model: order.model,
      isNew: order.isNew ? '是' : '否',
      price: order.price,
      quantity: order.quantity,
      paymentMethod: { 1: '现金', 2: '微信', 3: '支付宝', 4: '农商银行', 5: '其它' }[order.paymentMethod as number] || order.paymentMethod,
      notes: order.notes || '',
      profit: profitValue,
      // 将UTC时间转换为当地时间后再提取日期
      purchaseTime: order.purchaseTime ? new Date(order.purchaseTime).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '',
      createdAt: order.createdAt.split('T')[0],
      updatedAt: order.updatedAt.split('T')[0]
    });

    // 设置行高
    row.height = 22;

    // 设置所有单元格样式
    row.eachCell((cell: any) => {
      cell.font = { size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // 生成Excel缓冲区
  const buffer = await workbook.xlsx.writeBuffer() as Buffer;
  return { buffer, fileName };
};