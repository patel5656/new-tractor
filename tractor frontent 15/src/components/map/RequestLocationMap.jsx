import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

const DEFAULT_CENTER = { lat: 30.900965, lng: 75.857277 };
const LIBRARIES = ['places'];

export default function RequestLocationMap({ selectedLocation, onPick, autoUseCurrentLocation = true }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [deviceLocation, setDeviceLocation] = useState(null);
  const autoLocationLoadedRef = useRef(false);
  const watchIdRef = useRef(null);
  const manualPinRef = useRef(false);

  const center = useMemo(() => {
    if (selectedLocation) return selectedLocation;
    if (deviceLocation) return deviceLocation;
    return DEFAULT_CENTER;
  }, [selectedLocation, deviceLocation]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const point = { lat, lng };
        
        setDeviceLocation(point);

        if (autoUseCurrentLocation && !selectedLocation && !manualPinRef.current && !autoLocationLoadedRef.current) {
          autoLocationLoadedRef.current = true;
          onPick(point, 'gps');
        }
      },
      () => {
        // Silent fallback
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoUseCurrentLocation, onPick, selectedLocation]);

  if (loadError) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-xl">Error loading maps API.</div>;
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[420px] rounded-2xl bg-neutral-100 flex items-center justify-center border border-earth-dark/10">
        <div className="text-xs uppercase font-black text-earth-mut tracking-widest animate-pulse">
          Loading Google Maps...
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 w-full h-[420px] rounded-2xl overflow-hidden border border-earth-dark/10 shadow-lg">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={13}
        onClick={(e) => {
          if (!e.latLng) return;
          const lat = Number(e.latLng.lat().toFixed(6));
          const lng = Number(e.latLng.lng().toFixed(6));
          const point = { lat, lng };
          manualPinRef.current = true;
          onPick(point, 'manual');
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {deviceLocation && (
          <MarkerF
            position={deviceLocation}
            icon={window.google ? {
              url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="%232563eb" stroke="white" stroke-width="2"/></svg>',
              scaledSize: new window.google.maps.Size(16, 16),
              anchor: new window.google.maps.Point(8, 8),
            } : undefined}
          />
        )}
        {selectedLocation && (
          <MarkerF 
            position={selectedLocation}
          />
        )}
      </GoogleMap>
    </div>
  );
}

