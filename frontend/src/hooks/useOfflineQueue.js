import { useState } from 'react';

const QUEUE_KEY = 'offlineSosQueue';

/**
 * Hook that exposes the offline SOS queue stored in localStorage.
 * Provides helpers to read count and clear the queue.
 */
export function useOfflineQueue() {
    const getQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const [queueCount, setQueueCount] = useState(() => getQueue().length);

    const refresh = () => setQueueCount(getQueue().length);

    const clearQueue = () => {
        localStorage.removeItem(QUEUE_KEY);
        setQueueCount(0);
    };

    return { queueCount, refresh, clearQueue };
}
