import { useState, useEffect } from 'react';
import { getFeatureFlags, setFeatureFlag } from '../../lib/api';

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [knownFlags, setKnownFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeatureFlags();
      setFlags(data.flags);
      setKnownFlags(data.knownFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flag: string) => {
    setUpdating(flag);
    try {
      const newValue = !flags[flag];
      const result = await setFeatureFlag(flag, newValue);
      setFlags(result.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setUpdating(null);
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
        <button onClick={loadFlags} className="mt-2 text-sm text-red-600 dark:text-red-400 underline">
          Retry
        </button>
      </div>
    );
  }

  const flagDescriptions: Record<string, string> = {
    streaming: 'Enable streaming responses via SSE',
    moderation: 'Enable content moderation for messages',
    rate_limiting: 'Enable rate limiting for API requests',
    auto_title: 'Auto-generate conversation titles',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Toggle feature flags to enable or disable functionality across the application.
      </p>

      <div className="space-y-3">
        {knownFlags.map((flag) => (
          <div
            key={flag}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{flag}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {flagDescriptions[flag] || 'No description available'}
              </p>
            </div>
            <button
              onClick={() => toggleFlag(flag)}
              disabled={updating === flag}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                flags[flag]
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              } ${updating === flag ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flags[flag] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {knownFlags.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No feature flags configured
        </p>
      )}
    </div>
  );
}
