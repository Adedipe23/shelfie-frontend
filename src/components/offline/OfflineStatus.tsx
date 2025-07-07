import React, { useState, useEffect } from 'react';
import { useOfflineStore } from '../../store/offlineStore';
import { syncService } from '../../services/syncService';
import Button from '../ui/Button';

const OfflineStatus: React.FC = () => {
  const { isOnline, syncQueue, isSyncing, syncErrors } = useOfflineStore();
  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = () => {
    syncService.triggerSync();
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-yellow-500';
    if (syncQueue.length > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncQueue.length > 0) return `${syncQueue.length} pending`;
    return 'Online';
  };

  return (
    <div className="relative">
      {/* Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
        {syncQueue.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
            {syncQueue.length}
          </span>
        )}
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Sync Status
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Connection Status */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {isOnline 
                  ? 'All changes will be synced automatically'
                  : 'Changes will be saved locally and synced when connection is restored'
                }
              </p>
            </div>

            {/* Sync Queue */}
            {syncQueue.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Pending Operations ({syncQueue.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {syncQueue.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="text-xs bg-gray-50 dark:bg-gray-700 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {operation.type} {operation.entity}
                        </span>
                        {operation.retryCount > 0 && (
                          <span className="text-orange-600 dark:text-orange-400">
                            Retry {operation.retryCount}/{operation.maxRetries}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(operation.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {syncQueue.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                      ... and {syncQueue.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sync Errors */}
            {syncErrors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Sync Errors ({syncErrors.length})
                </h4>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {syncErrors.map((error, index) => (
                    <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded p-2">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Sync */}
            {syncStatus.lastSyncAttempt && (
              <div className="mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Last sync attempt: {new Date(syncStatus.lastSyncAttempt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Syncing...
                  </>
                ) : (
                  'Sync Now'
                )}
              </Button>
              
              {syncErrors.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useOfflineStore.getState().clearSyncErrors()}
                >
                  Clear Errors
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                Offline Mode Tips:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Changes are saved locally when offline</li>
                <li>• Data syncs automatically when reconnected</li>
                <li>• Failed operations are retried automatically</li>
                <li>• Critical data is cached for offline access</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatus;
