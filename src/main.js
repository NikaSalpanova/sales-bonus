/**
 * Функция для расчета выручки
 *
 * @param purchase запись о покупке, это одна из записей в поле items из чека в data.purchase_records
 * @param _product карточка товара, это продукт из коллекции data.products
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;

  //   Перевести скидку из процентов в десятичное число: скидка / 100.

  // Посчитать полную стоимость, умножив цену продажи на количество.
  // Умножить полную стоимость на 1 - десятичная скидка,
  // чтобы получить остаток суммы без скидки.
  return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;

  // @TODO: Проверка наличия опций
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Чего-то не хватает");
  }

  // @TODO: Проверка входных данных
  if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  let sellerStats = data.sellers.map((seller) => {
    return {
      // Заполним начальными данными
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };
  });

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => {
      return [seller.id, seller];
    })
  );

  const productIndex = Object.fromEntries(
    data.products.map((product) => {
      return [product.sku, product];
    })
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    seller.sales_count++;
    // Увеличить общую сумму всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const primeCost = product.purchase_price * item.quantity;
      product.primeCost = primeCost;

      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      let calculateRevenue = calculateSimpleRevenue(item);

      // Посчитать прибыль: выручка минус себестоимость
      let profit = calculateRevenue - primeCost;

      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku]++;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index, array) => {
    seller.bonus = calculateBonusByProfit(index, array.length, seller); // Считаем бонус
    seller.top_products = Object.entries(seller.products_sold)
      .map(([key, value]) => ({ sku: key, quantity: value }))
      .toSorted((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Формируем топ-10 товаров
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
