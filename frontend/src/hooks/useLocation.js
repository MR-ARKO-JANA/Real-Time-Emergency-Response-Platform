import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export function useLocation() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let watchId = null;

        const startNativeWatch = async () => {
            try {
                // Use Capacitor native GPS (Android/iOS) if available
                await Geolocation.requestPermissions();
                watchId = await Geolocation.watchPosition(
                    { enableHighAccuracy: true },
                    (position, err) => {
                        if (err) { setError(err.message); return; }
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                        });
                    }
                );
            } catch (_) {
                // Fallback: use browser Web Geolocation API
                if (!navigator.geolocation) {
                    setError("Geolocation is not supported by your browser");
                    return;
                }
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                        });
                    },
                    (err) => setError(err.message),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
        };

        startNativeWatch();

        return () => {
            if (watchId != null) {
                // Try native clear first, then browser
                Geolocation.clearWatch({ id: watchId }).catch(() => {
                    navigator.geolocation.clearWatch(watchId);
                });
            }
        };
    }, []);

    return { location, error };
}
