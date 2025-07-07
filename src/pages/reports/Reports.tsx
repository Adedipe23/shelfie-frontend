import React, { useState, useEffect } from 'react';
import {
  reportService,
  GenerateSalesReportResponse,
  DailySalesReport
} from '../../services/reportService';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const Reports: React.FC = () => {
  const [salesReportData, setSalesReportData] = useState<GenerateSalesReportResponse | null>(null);
  const [dailySalesData, setDailySalesData] = useState<DailySalesReport[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0], // Today
  });
  const [dailySalesDays, setDailySalesDays] = useState(7);

  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Format dates properly for API (with time components)
      const startDateTime = `${dateRange.startDate}T00:00:00.000Z`; // Start of day
      const endDateTime = `${dateRange.endDate}T23:59:59.999Z`;     // End of day

      const [salesReport, dailySales] = await Promise.all([
        reportService.generateSalesReport(startDateTime, endDateTime),
        reportService.getDailySalesReport(dailySalesDays),
      ]);

      setSalesReportData(salesReport);
      setDailySalesData(dailySales);
    } catch (error) {
      showError('Failed to load reports');
      // Don't set fallback data - let the UI show the error state
      setSalesReportData(null);
      setDailySalesData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    fetchReports();
  };

  const handleDailySalesDaysChange = (days: number) => {
    setDailySalesDays(days);
    // Fetch daily sales with new days parameter
    reportService.getDailySalesReport(days)
      .then(setDailySalesData)
      .catch(error => {
        console.error('Failed to fetch daily sales:', error);
        showError('Failed to load daily sales data');
      });
  };

  const handleExportSales = async () => {
    try {
      const csvData = await reportService.exportSalesReport(dateRange.startDate, dateRange.endDate);
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess('Sales report exported successfully');
    } catch (error) {
      console.error('Failed to export sales report:', error);
      showError('Failed to export sales report');
    }
  };

  if (loading && !salesReportData && dailySalesData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">
            View sales performance and analytics
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {dateRange.startDate === dateRange.endDate
              ? `Today: ${new Date(dateRange.startDate).toLocaleDateString()}`
              : `Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`
            }
          </p>
        </div>
        <Button onClick={fetchReports} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Reports'}
        </Button>
      </div>

      {/* Report Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Sales Report by Date Range">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <Button onClick={handleDateRangeChange} disabled={loading} className="w-full">
              {loading ? 'Loading...' : 'Generate Sales Report'}
            </Button>
          </div>
        </Card>

        <Card title="Daily Sales Report">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Days
              </label>
              <select
                value={dailySalesDays}
                onChange={(e) => handleDailySalesDaysChange(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing daily sales for the last {dailySalesDays} days
            </p>
          </div>
        </Card>
      </div>

      {/* Sales Reports Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Report Summary */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>Sales Report Summary</span>
              <Button variant="outline" size="sm" onClick={handleExportSales}>
                Export CSV
              </Button>
            </div>
          }
        >
          {salesReportData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      ${salesReportData.total_sales.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(salesReportData.start_date).toLocaleDateString()} - {new Date(salesReportData.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {salesReportData.order_count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${salesReportData.average_order_value.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading sales report...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No sales data available for the selected period</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try selecting a different date range or check if there are any sales recorded
              </p>
            </div>
          )}
        </Card>

        {/* Daily Sales Report */}
        <Card title="Daily Sales Report">
          {dailySalesData.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${dailySalesData.reduce((sum, day) => sum + day.total_sales, 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Sales ({dailySalesDays} days)
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Sales</th>
                      <th className="text-right py-2">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySalesData
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((day, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="text-right py-2">${day.total_sales.toFixed(2)}</td>
                        <td className="text-right py-2">{day.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading daily sales...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No daily sales data available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Sales data will appear here once transactions are recorded
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Reports;
