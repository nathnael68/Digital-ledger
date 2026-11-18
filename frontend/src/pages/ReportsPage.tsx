import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  ShieldAlert,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { reportService } from '../services/reportService';
import {
  CollectionReportResponse,
  CreditSalesReportResponse,
  CustomerReportResponse,
  DailySalesReportResponse,
  EmployeeActivityReportResponse,
  ReportOverviewResponse,
  ReportPeriodOption,
  ReportType,
} from '../types/report';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';

type ActiveTab =
  | 'overview'
  | 'daily'
  | 'cash'
  | 'bank'
  | 'credit'
  | 'employees'
  | 'customers';

export const ReportsPage: React.FC = () => {
  // Navigation and filter state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [period, setPeriod] = useState<ReportPeriodOption>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [dailyDate, setDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [customerFilter, setCustomerFilter] = useState<'all' | 'with_balance' | 'settled'>('all');

  // Loading & export states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Data states
  const [overviewData, setOverviewData] = useState<ReportOverviewResponse | null>(null);
  const [dailyData, setDailyData] = useState<DailySalesReportResponse | null>(null);
  const [cashData, setCashData] = useState<CollectionReportResponse | null>(null);
  const [bankData, setBankData] = useState<CollectionReportResponse | null>(null);
  const [creditData, setCreditData] = useState<CreditSalesReportResponse | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeActivityReportResponse | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReportResponse | null>(null);

  // Fetch report based on active tab and filters
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        period: period !== 'custom' ? period : undefined,
        start_date: period === 'custom' ? customStart : undefined,
        end_date: period === 'custom' ? customEnd : undefined,
      };

      if (activeTab === 'overview') {
        const data = await reportService.getOverview(queryParams);
        setOverviewData(data);
      } else if (activeTab === 'daily') {
        const data = await reportService.getDailySalesReport(dailyDate);
        setDailyData(data);
      } else if (activeTab === 'cash') {
        const data = await reportService.getCashCollections(queryParams);
        setCashData(data);
      } else if (activeTab === 'bank') {
        const data = await reportService.getBankCollections(queryParams);
        setBankData(data);
      } else if (activeTab === 'credit') {
        const data = await reportService.getCreditSalesReport(queryParams);
        setCreditData(data);
      } else if (activeTab === 'employees') {
        const data = await reportService.getEmployeeActivityReport(queryParams);
        setEmployeeData(data);
      } else if (activeTab === 'customers') {
        const data = await reportService.getCustomerSalesReport({
          ...queryParams,
          has_balance:
            customerFilter === 'with_balance'
              ? true
              : customerFilter === 'settled'
              ? false
              : undefined,
        });
        setCustomerData(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, period, customStart, customEnd, dailyDate, customerFilter]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Determine report_type for file export based on active tab and period
  const getExportReportType = (): ReportType => {
    switch (activeTab) {
      case 'daily':
        return 'daily_sales';
      case 'cash':
        return 'cash_collections';
      case 'bank':
        return 'bank_collections';
      case 'credit':
        return 'credit_sales';
      case 'employees':
        return 'employee_activity';
      case 'customers':
        return 'customer_sales';
      case 'overview':
      default:
        if (period === 'today' || period === 'yesterday') return 'daily_sales';
        if (period === 'this_week' || period === 'last_week') return 'weekly_sales';
        if (period === 'this_month' || period === 'last_month') return 'monthly_sales';
        return 'custom_range';
    }
  };

  // Excel export trigger
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportNotification(null);
    try {
      const reportType = getExportReportType();
      await reportService.exportExcel({
        report_type: reportType,
        period: period !== 'custom' ? period : undefined,
        start_date: period === 'custom' ? customStart : (activeTab === 'daily' ? dailyDate : undefined),
        end_date: period === 'custom' ? customEnd : (activeTab === 'daily' ? dailyDate : undefined),
      });
      setExportNotification('Excel report downloaded successfully.');
      setTimeout(() => setExportNotification(null), 4000);
    } catch (err: any) {
      setError(`Excel export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF export trigger
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setExportNotification(null);
    try {
      const reportType = getExportReportType();
      await reportService.exportPdf({
        report_type: reportType,
        period: period !== 'custom' ? period : undefined,
        start_date: period === 'custom' ? customStart : (activeTab === 'daily' ? dailyDate : undefined),
        end_date: period === 'custom' ? customEnd : (activeTab === 'daily' ? dailyDate : undefined),
      });
      setExportNotification('PDF document downloaded successfully.');
      setTimeout(() => setExportNotification(null), 4000);
    } catch (err: any) {
      setError(`PDF export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-delgone-navy-800 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-delgone-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports & Financial Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Delgone Trading PLC — Business Performance, Collections & Audit
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Refresh, Print, Excel, PDF */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchReportData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh current report data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            title="Print report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Print
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg shadow-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
            title="Download formatted Excel (.xlsx) spreadsheet with preserved leading zeros"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            {isExportingExcel ? 'Exporting...' : 'Excel (.xlsx)'}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-delgone-navy-800 hover:bg-delgone-navy-700 border border-delgone-navy-900 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            title="Download audit-ready PDF document"
          >
            <FileText className="w-3.5 h-3.5 text-delgone-gold-400" />
            {isExportingPdf ? 'Generating...' : 'PDF Document'}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {exportNotification && (
        <div className="flex items-center gap-2 p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Primary Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap -mb-px gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'daily'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Daily Sales Closeout
          </button>

          <button
            onClick={() => setActiveTab('cash')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'cash'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cash Collections
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'bank'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Bank & Telebirr
          </button>

          <button
            onClick={() => setActiveTab('credit')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'credit'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Credit Sales
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'employees'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Employee Activity
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-delgone-navy-800 text-delgone-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Building className="w-4 h-4" />
            Customer Sales
          </button>
        </nav>
      </div>

      {/* 3. Filter Bar (Period Selection / Custom Dates / Daily Date) */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4">
        {activeTab === 'daily' ? (
          // Daily Closeout Date Picker
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                Select Daily Closeout Date:
              </span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              Times displayed in <span className="font-semibold text-slate-700">Addis Ababa Time (EAT)</span>
            </div>
          </div>
        ) : (
          // Period Selector Bar
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Period:
              </span>

              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'last_week', label: 'Last Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'custom', label: 'Custom Range' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPeriod(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    period === opt.id
                      ? 'bg-delgone-navy-800 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs (if custom selected) */}
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">From:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">To:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg shadow-sm"
                  />
                </div>
                <button
                  onClick={() => fetchReportData()}
                  disabled={!customStart || !customEnd}
                  className="px-3 py-1 text-xs font-semibold text-white bg-delgone-navy-800 rounded-lg shadow-sm hover:bg-delgone-navy-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Customer Filter Pills (if Customer tab) */}
            {activeTab === 'customers' && (
              <div className="flex items-center gap-1.5 border-t lg:border-t-0 pt-2 lg:pt-0">
                <span className="text-xs font-semibold text-slate-600 mr-1">Filter:</span>
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    customerFilter === 'all'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCustomerFilter('with_balance')}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    customerFilter === 'with_balance'
                      ? 'bg-amber-700 text-white font-medium'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  With Balance
                </button>
                <button
                  onClick={() => setCustomerFilter('settled')}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    customerFilter === 'settled'
                      ? 'bg-emerald-700 text-white font-medium'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  Settled Only
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Tab Content Panels */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-delgone-navy-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Calculating financial metrics from database records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && overviewData && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Sales Revenue */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Sales Revenue
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-delgone-navy-50 text-delgone-navy-800 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                      {formatCurrency(overviewData.summary.total_sales_revenue)}
                    </span>
                    {overviewData.summary.revenue_comparison?.percentage_change !== null &&
                      overviewData.summary.revenue_comparison?.percentage_change !== undefined && (
                        <span
                          className={`inline-flex items-center text-xs font-semibold ${
                            overviewData.summary.revenue_comparison.percentage_change >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {overviewData.summary.revenue_comparison.percentage_change >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                          )}
                          {overviewData.summary.revenue_comparison.percentage_change > 0 ? '+' : ''}
                          {overviewData.summary.revenue_comparison.percentage_change.toFixed(1)}%
                        </span>
                      )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {overviewData.summary.transaction_count} active transactions (excl. voided)
                  </p>
                </div>

                {/* 2. Cash Collections */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cash Collections
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold tracking-tight text-emerald-800">
                      {formatCurrency(overviewData.summary.cash_collections)}
                    </span>
                    {overviewData.summary.cash_comparison?.percentage_change !== null &&
                      overviewData.summary.cash_comparison?.percentage_change !== undefined && (
                        <span
                          className={`inline-flex items-center text-xs font-semibold ${
                            overviewData.summary.cash_comparison.percentage_change >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {overviewData.summary.cash_comparison.percentage_change > 0 ? '+' : ''}
                          {overviewData.summary.cash_comparison.percentage_change.toFixed(1)}%
                        </span>
                      )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Physical drawer cash verified</p>
                </div>

                {/* 3. Bank / Electronic Collections */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Bank & Telebirr
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold tracking-tight text-blue-900">
                      {formatCurrency(overviewData.summary.bank_collections)}
                    </span>
                    {overviewData.summary.bank_comparison?.percentage_change !== null &&
                      overviewData.summary.bank_comparison?.percentage_change !== undefined && (
                        <span
                          className={`inline-flex items-center text-xs font-semibold ${
                            overviewData.summary.bank_comparison.percentage_change >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {overviewData.summary.bank_comparison.percentage_change > 0 ? '+' : ''}
                          {overviewData.summary.bank_comparison.percentage_change.toFixed(1)}%
                        </span>
                      )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Electronic transfers & mobile money</p>
                </div>

                {/* 4. Current Outstanding Balance */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Outstanding Receivables
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold tracking-tight text-amber-900">
                      {formatCurrency(overviewData.summary.current_outstanding_balance)}
                    </span>
                    <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Point-in-Time
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Uncollected customer balances</p>
                </div>
              </div>

              {/* Secondary Metric Bar: Credit Sales Created, Discounts, Voided Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Credit Sales Created:</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(overviewData.summary.credit_sales)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Total Discounts Given:</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(overviewData.summary.total_discounts)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    Voided Sales (Excluded):
                  </span>
                  <span className="text-xs font-bold text-rose-700">
                    {overviewData.summary.voided_sales_count} ({formatCurrency(overviewData.summary.voided_sales_amount)})
                  </span>
                </div>
              </div>

              {/* Revenue vs Collections Daily Trend & Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2/3 Column: Period Trend Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-delgone-navy-800" />
                      Sales Revenue & Collections Trend
                    </h3>
                    <span className="text-xs text-slate-400">
                      {overviewData.trends.length} days in period
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-medium">
                          <th className="pb-2">Date</th>
                          <th className="pb-2 text-right">Sales Revenue</th>
                          <th className="pb-2 text-right">Cash In</th>
                          <th className="pb-2 text-right">Bank / Mobile</th>
                          <th className="pb-2 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overviewData.trends.map((t) => (
                          <tr key={t.date} className="hover:bg-slate-50/60">
                            <td className="py-2.5 font-medium text-slate-900">
                              {t.day_label} <span className="text-slate-400 text-[11px]">({t.date})</span>
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-900">
                              {formatCurrency(t.sales_revenue)}
                            </td>
                            <td className="py-2.5 text-right font-medium text-emerald-700">
                              {formatCurrency(t.cash_collected)}
                            </td>
                            <td className="py-2.5 text-right font-medium text-blue-700">
                              {formatCurrency(t.bank_collected)}
                            </td>
                            <td className="py-2.5 text-right text-slate-500">
                              {t.transaction_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 1/3 Column: Payment Method Distribution */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-delgone-navy-800" />
                    Payment Method Distribution
                  </h3>

                  <div className="space-y-4">
                    {overviewData.payment_breakdown.map((item) => (
                      <div key={item.method} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{item.method_label}</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(item.total_amount)}{' '}
                            <span className="text-slate-400 font-normal">({item.percentage.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.method === 'cash'
                                ? 'bg-emerald-500'
                                : item.method === 'telebirr'
                                ? 'bg-sky-500'
                                : item.method === 'cbe_birr'
                                ? 'bg-indigo-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 text-right">
                          {item.count} payment transactions
                        </div>
                      </div>
                    ))}

                    {overviewData.payment_breakdown.length === 0 && (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        No payments recorded for this period.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY SALES CLOSEOUT */}
          {activeTab === 'daily' && dailyData && (
            <div className="space-y-6">
              {/* Daily KPI summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Daily Sales Revenue</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(dailyData.summary.total_sales_revenue)}
                  </p>
                  <p className="text-[11px] text-slate-400">{dailyData.summary.transaction_count} active sales</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Cash Collected</span>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    {formatCurrency(dailyData.summary.cash_collections)}
                  </p>
                  <p className="text-[11px] text-slate-400">Cash drawer total</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Bank & Telebirr</span>
                  <p className="text-lg font-bold text-blue-700 mt-1">
                    {formatCurrency(dailyData.summary.bank_collections)}
                  </p>
                  <p className="text-[11px] text-slate-400">Electronic verification</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Discounts Given</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(dailyData.summary.total_discounts)}
                  </p>
                  <p className="text-[11px] text-slate-400">Promotions / price reductions</p>
                </div>
              </div>

              {/* Valid Daily Transactions Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Registered Sales Transactions for {dailyData.report_date}
                    </h3>
                    <p className="text-xs text-slate-500">
                      All valid transactions contributing to daily register revenue
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-700">
                    {dailyData.transactions.length} Transactions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Sale #</th>
                        <th className="py-3 px-4">FS Number</th>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Cashier</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                        <th className="py-3 px-4 text-right">Amount Paid</th>
                        <th className="py-3 px-4 text-right">Balance Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyData.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-delgone-navy-800">
                            <Link to={`/sales/${tx.id}`} className="hover:underline flex items-center gap-1">
                              {tx.sale_number}
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{tx.fs_number || '-'}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{tx.paper_receipt_number || '-'}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {formatDateTime(tx.sale_date).split(',')[1] || tx.sale_date}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {tx.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{tx.created_by_name}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(tx.grand_total)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-700">
                            {formatCurrency(tx.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-amber-800">
                            {formatCurrency(tx.outstanding_balance)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={tx.payment_status} />
                          </td>
                        </tr>
                      ))}
                      {dailyData.transactions.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No sales transactions recorded on {dailyData.report_date}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Voided Transactions Audit Section */}
              <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                      Voided Transactions Audit Section ({dailyData.voided_transactions.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700">
                    Excluded from Revenue: {formatCurrency(dailyData.summary.voided_sales_amount)}
                  </span>
                </div>

                {dailyData.voided_transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-2.5 px-4">Sale #</th>
                          <th className="py-2.5 px-4">FS Number</th>
                          <th className="py-2.5 px-4">Customer</th>
                          <th className="py-2.5 px-4 text-right">Voided Amount</th>
                          <th className="py-2.5 px-4">Mandatory Justification / Reason</th>
                          <th className="py-2.5 px-4">Created By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyData.voided_transactions.map((vt) => (
                          <tr key={vt.id} className="hover:bg-rose-50/30">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-700 line-through">
                              {vt.sale_number}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{vt.fs_number || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-700">{vt.customer_name || 'Walk-in'}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-rose-700">
                              {formatCurrency(vt.grand_total)}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-rose-900">
                              {vt.void_reason || 'No justification provided'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">{vt.created_by_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No voided transactions recorded on this date. Clean audit closeout.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CASH COLLECTIONS */}
          {activeTab === 'cash' && cashData && (
            <div className="space-y-6">
              {/* Cash Collection Summary Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Physical Cash Drawer Collections
                  </span>
                  <h3 className="text-2xl font-black text-emerald-900 mt-1">
                    {formatCurrency(cashData.total_amount)}
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {cashData.period_label} — {cashData.payment_count} verified cash receipts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    Audited Cash Receipts
                  </span>
                </div>
              </div>

              {/* Cash Receipts Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Itemized Cash Collections</h3>
                  <p className="text-xs text-slate-500">
                    Receipt records categorized by payment timestamp (including down payments and debt settlements)
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Payment Time</th>
                        <th className="py-3 px-4">Sale #</th>
                        <th className="py-3 px-4">FS Number</th>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Cashier</th>
                        <th className="py-3 px-4 text-right">Cash Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {formatDateTime(item.payment_date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-delgone-navy-800">
                            <Link to={`/sales/${item.sale_id}`} className="hover:underline">
                              {item.sale_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{item.fs_number || '-'}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{item.paper_receipt_number || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {item.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.recorded_by_name}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-800">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      {cashData.items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            No cash collections recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANK & TELEBIRR COLLECTIONS */}
          {activeTab === 'bank' && bankData && (
            <div className="space-y-6">
              {/* Bank Collection Summary Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                    Bank Transfers, CBE Birr & Telebirr Collections
                  </span>
                  <h3 className="text-2xl font-black text-blue-900 mt-1">
                    {formatCurrency(bankData.total_amount)}
                  </h3>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {bankData.period_label} — {bankData.payment_count} electronic transactions verified
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-800 bg-blue-100 px-3 py-1 rounded-full">
                    Slip Reference Audited
                  </span>
                </div>
              </div>

              {/* Bank Collections Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Itemized Electronic & Bank Receipts</h3>
                  <p className="text-xs text-slate-500">
                    Direct deposits, mobile payments, and wire receipts with transaction references
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Payment Time</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Slip Reference / Tx ID</th>
                        <th className="py-3 px-4">Sale #</th>
                        <th className="py-3 px-4">FS Number</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Recorded By</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bankData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {formatDateTime(item.payment_date)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                item.payment_method === 'telebirr'
                                  ? 'bg-sky-100 text-sky-800'
                                  : item.payment_method === 'cbe_birr'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {item.reference || <span className="text-slate-400 italic">No ref</span>}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-delgone-navy-800">
                            <Link to={`/sales/${item.sale_id}`} className="hover:underline">
                              {item.sale_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{item.fs_number || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {item.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.recorded_by_name}</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      {bankData.items.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            No electronic or bank collections recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CREDIT SALES & AGING */}
          {activeTab === 'credit' && creditData && (
            <div className="space-y-6">
              {/* Credit Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Credit Granted in Period</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {formatCurrency(creditData.total_credit_created)}
                  </p>
                  <p className="text-[11px] text-slate-400">Initial credit extended at checkout</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Remaining Uncollected Balance</span>
                  <p className="text-xl font-bold text-amber-900 mt-1">
                    {formatCurrency(creditData.total_current_balance)}
                  </p>
                  <p className="text-[11px] text-slate-400">Current active receivables on these sales</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Credit Invoices Count</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {creditData.credit_sales_count} Transactions
                    </p>
                  </div>
                  <Link
                    to="/customers"
                    className="text-xs font-semibold text-delgone-navy-800 hover:underline flex items-center gap-1 mt-2"
                  >
                    View Aging Breakdown (0–30, 31–60, 61–90, &gt;90)
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Credit Sales Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Credit & Partial Transactions ({creditData.period_label})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tracking initial credit extended versus subsequent settlements
                    </p>
                  </div>
                  <Link
                    to="/customers"
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    Manage Customer Balances
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Sale #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Sale Date</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                        <th className="py-3 px-4 text-right">Down Payment</th>
                        <th className="py-3 px-4 text-right">Credit Granted</th>
                        <th className="py-3 px-4 text-right">Total Settled</th>
                        <th className="py-3 px-4 text-right">Remaining Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {creditData.items.map((cs) => (
                        <tr key={cs.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-delgone-navy-800">
                            <Link to={`/sales/${cs.id}`} className="hover:underline">
                              {cs.sale_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {cs.customer_id ? (
                              <Link to={`/customers/${cs.customer_id}`} className="hover:underline text-delgone-navy-800">
                                {cs.customer_name}
                              </Link>
                            ) : (
                              cs.customer_name || 'Walk-in'
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{formatDate(cs.sale_date)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {formatCurrency(cs.grand_total)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency(cs.initial_amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-blue-700">
                            {formatCurrency(cs.initial_credit_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-700">
                            {formatCurrency(cs.current_amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-800">
                            {formatCurrency(cs.current_outstanding_balance)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={cs.payment_status} />
                          </td>
                        </tr>
                      ))}
                      {creditData.items.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400">
                            No credit sales created in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EMPLOYEE ACTIVITY */}
          {activeTab === 'employees' && employeeData && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">
                    Employee Sales & Collections Activity ({employeeData.period_label})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sales generated vs subsequent collections recorded by each staff member
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Sales Count</th>
                        <th className="py-3 px-4 text-right">Sales Revenue</th>
                        <th className="py-3 px-4 text-right">Cash at Counter</th>
                        <th className="py-3 px-4 text-right">Bank at Counter</th>
                        <th className="py-3 px-4 text-right">Credit Issued</th>
                        <th className="py-3 px-4 text-right">Subsequent Collections</th>
                        <th className="py-3 px-4 text-right">Total Inflow Handled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeData.items.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {emp.employee_name}{' '}
                            <span className="text-slate-400 font-mono text-[11px]">({emp.username})</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {emp.role === 'admin' ? 'Administrator' : 'Sales Employee'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {emp.sales_created_count}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(emp.sales_revenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-700">
                            {formatCurrency(emp.initial_cash_received)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-blue-700">
                            {formatCurrency(emp.initial_bank_received)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-amber-700">
                            {formatCurrency(emp.initial_credit_created)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-indigo-700">
                            {formatCurrency(emp.subsequent_payments_amount)}{' '}
                            <span className="text-slate-400 text-[10px]">({emp.subsequent_payments_count})</span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatCurrency(emp.total_collections_recorded)}
                          </td>
                        </tr>
                      ))}
                      {employeeData.items.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400">
                            No employee sales activity recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOMER SALES */}
          {activeTab === 'customers' && customerData && (
            <div className="space-y-6">
              {/* Customer Sales Aggregated Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Active Clients</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {customerData.total_customers} Customers
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Period Sales Total</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {formatCurrency(customerData.total_sales)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Collections Received</span>
                  <p className="text-xl font-bold text-emerald-800 mt-1">
                    {formatCurrency(customerData.total_payments)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Total Balance Due</span>
                  <p className="text-xl font-bold text-amber-900 mt-1">
                    {formatCurrency(customerData.total_outstanding)}
                  </p>
                </div>
              </div>

              {/* Customer Sales Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Customer Purchasing & Settlements ({customerData.period_label})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aggregated sales volume and lifetime outstanding receivables by client
                    </p>
                  </div>
                  <Link
                    to="/customers"
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    Open Customer Directory
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4 text-right">Purchases (ETB)</th>
                        <th className="py-3 px-4 text-right">Payments (ETB)</th>
                        <th className="py-3 px-4 text-right">Outstanding Balance</th>
                        <th className="py-3 px-4 text-right">Invoices</th>
                        <th className="py-3 px-4">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerData.items.map((cust) => (
                        <tr key={cust.customer_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <Link
                              to={`/customers/${cust.customer_id}`}
                              className="hover:underline text-delgone-navy-800 flex items-center gap-1"
                            >
                              {cust.customer_name}
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{cust.company_name || '-'}</td>
                          <td className="py-3 px-4 text-slate-600">{cust.phone || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(cust.total_sales)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-700">
                            {formatCurrency(cust.total_payments)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-800">
                            {formatCurrency(cust.outstanding_balance)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">{cust.transaction_count}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {cust.last_sale_date ? formatDate(cust.last_sale_date) : '-'}
                          </td>
                        </tr>
                      ))}
                      {customerData.items.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            No customer records matching this filter for {customerData.period_label}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
