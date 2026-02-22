import { useState, useEffect } from 'react';
import { getAdminMetrics, type AdminMetrics } from '../../lib/api';

type Period = '24h' | '7d' | '30d';

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [period, setPeriod] = useState<Period>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminMetrics(period);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadMetrics}
          className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['24h', '7d', '30d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {p === '24h' ? 'Last 24 Hours' : p === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Request Volume */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Request Volume</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics?.requestVolume.total.toLocaleString() ?? 0}
          </p>
        </div>

        {/* Latency P95 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Latency (P95)</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics?.latency.p95.toFixed(0) ?? 0}ms
          </p>
        </div>

        {/* Error Rate */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Error Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {((metrics?.errors.rate ?? 0) * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Latency breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latency Percentiles</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">P50</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {metrics?.latency.p50.toFixed(0) ?? 0}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">P95</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {metrics?.latency.p95.toFixed(0) ?? 0}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">P99</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {metrics?.latency.p99.toFixed(0) ?? 0}ms
            </p>
          </div>
        </div>
      </div>

      {/* Error breakdown */}
      {metrics?.errors.byType && Object.keys(metrics.errors.byType).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Errors by Type</h3>
          <div className="space-y-2">
            {Object.entries(metrics.errors.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
