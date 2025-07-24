export const fetchRecords = () => {
  // Here, you can fetch records from local storage or an API
  // For now, return a sample array of records
  return [
    {
      platform: 'Myntra',
      date: '2025-07-10',
      totalOrders: 100,
      totalSales: 25000,
    },
    {
      platform: 'Amazon',
      date: '2025-07-11',
      totalOrders: 150,
      totalSales: 30000,
    },
  ];
};
