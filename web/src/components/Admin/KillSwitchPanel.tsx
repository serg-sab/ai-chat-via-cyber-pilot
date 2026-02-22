import { useState, useEffect } from 'react';
import { setKillSwitch } from '../../lib/api';

interface ModelStatus {
  model: string;
  enabled: boolean;
  description: string;
}

const MODELS: ModelStatus[] = [
  { model: 'gpt-4', enabled: true, description: 'GPT-4 - Most capable model' },
  { model: 'gpt-4-turbo', enabled: true, description: 'GPT-4 Turbo - Faster, cheaper GPT-4' },
  { model: 'gpt-3.5-turbo', enabled: true, description: 'GPT-3.5 Turbo - Fast and efficient' },
];

export function KillSwitchPanel() {
  const [models, setModels] = useState<ModelStatus[]>(MODELS);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const toggleModel = async (model: string) => {
    setUpdating(model);
    setError(null);
    try {
      const currentModel = models.find((m) => m.model === model);
      const newEnabled = !currentModel?.enabled;
      const result = await setKillSwitch(model, newEnabled);
      
      setModels((prev) =>
        prev.map((m) =>
          m.model === model ? { ...m, enabled: result.status.enabled } : m
        )
      );
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update kill switch');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Kill Switch Controls</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Disabling a model will immediately prevent all new requests from using it.
              Active streams will complete but no new requests will be accepted.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400">{message}</p>
        </div>
      )}

      <div className="space-y-3">
        {models.map((model) => (
          <div
            key={model.model}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
              model.enabled
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  model.enabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{model.model}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{model.description}</p>
              </div>
            </div>
            <button
              onClick={() => toggleModel(model.model)}
              disabled={updating === model.model}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                model.enabled
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${updating === model.model ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {updating === model.model
                ? 'Updating...'
                : model.enabled
                ? 'Disable'
                : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
