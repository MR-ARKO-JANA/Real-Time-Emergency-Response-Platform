import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon definitions from original app
const createUserIcon = () => L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-user"></div>`,
    iconSize: [20, 20]
});

const createSosIcon = () => L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-sos"><div class="marker-sos-inner"></div></div>`,
    iconSize: [48, 48]
});

const createResponderIcon = (skill) => {
    let initial = (skill || 'R').charAt(0).toUpperCase();
    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-responder">${initial}</div>`,
        iconSize: [38, 38]
    });
};

function MapViewUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.setView([center.lat, center.lng], map.getZoom());
        }
    }, [center, map]);
    return null;
}

export function MapContainer({ userLocation, activeIncidents, responders, mode }) {
    const defaultCenter = [20.5937, 78.9629]; // Default to India center
    const center = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

    return (
        <div id="map" className="w-full h-full relative z-0">
            <LeafletMap 
                center={center} 
                zoom={15} 
                style={{ height: '100%', width: '100%', background: '#0c0e12' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri'
                    className="map-tiles"
                />

                {userLocation && (
                    <>
                        <MapViewUpdater center={userLocation} />
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()} zIndexOffset={1000} />
                        <Circle 
                            center={[userLocation.lat, userLocation.lng]} 
                            radius={userLocation.accuracy || 100} 
                            pathOptions={{ color: '#4cd7f6', fillColor: '#4cd7f6', fillOpacity: 0.08, weight: 1 }} 
                        />
                    </>
                )}

                {activeIncidents.map(incident => (
                    <Marker 
                        key={incident.id || incident._id} 
                        position={[incident.lat, incident.lng]} 
                        icon={createSosIcon()}
                    >
                        <Popup className="custom-popup">
                            <span className="popup-sos-title">{incident.type || 'EMERGENCY'}</span>
                            <span className="popup-meta">{incident.description || 'Immediate assistance required'}</span>
                            {mode === 'responder' && (
                                <button className="btn-sos mt-2" onClick={() => window.acceptEmergency && window.acceptEmergency(incident.id)}>
                                    Accept Emergency
                                </button>
                            )}
                        </Popup>
                    </Marker>
                ))}

                {responders && Object.values(responders).map(responder => (
                    <Marker 
                        key={responder.id} 
                        position={[responder.lat, responder.lng]} 
                        icon={createResponderIcon(responder.skill)}
                    >
                        <Popup>
                            <strong>{responder.name}</strong><br/>
                            {responder.skill || 'Responder'}
                        </Popup>
                    </Marker>
                ))}
            </LeafletMap>
        </div>
    );
}
