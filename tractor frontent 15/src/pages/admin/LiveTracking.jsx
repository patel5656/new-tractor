import { useEffect, useMemo, useState, Fragment, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, Polyline } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { api } from '../../lib/api';
import API_BASE_URL from '../../config/api';
import { BrainCircuit } from 'lucide-react';
import AIHeatmapLayer from '../../components/admin/ai/AIHeatmapLayer';

const SOCKET_URL = API_BASE_URL;
const DEFAULT_CENTER = { lat: 30.900965, lng: 75.857277 };
const LIBRARIES = ['places'];

const getDistance = (p1, p2) => {
  const R = 6371e3; // metres
  const φ1 = p1.lat * Math.PI / 180;
  const φ2 = p2.lat * Math.PI / 180;
  const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
  const Δλ = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in metres
};

const getTractorIcon = (heading = 0) => {
  if (!window.google) return undefined;
  return {
    url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><g transform="rotate(${heading} 19 19)"><rect width="38" height="38" rx="12" fill="%2316a34a" /><text x="19" y="26" font-size="20" text-anchor="middle">🚜</text></g></svg>`,
    scaledSize: new window.google.maps.Size(38, 38),
    anchor: new window.google.maps.Point(19, 19),
  };
};

const getFarmerIcon = () => {
  if (!window.google) return undefined;
  return {
    url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="%23dc2626" /><text x="18" y="25" font-size="18" text-anchor="middle">📍</text></svg>`,
    scaledSize: new window.google.maps.Size(36, 36),
    anchor: new window.google.maps.Point(18, 18),
  };
};

const getRoute = async (start, end) => {
  if (window.google) {
    return new Promise((resolve) => {
      const ds = new window.google.maps.DirectionsService();
      ds.route(
        {
          origin: { lat: start.lat, lng: start.lng },
          destination: { lat: end.lat, lng: end.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK') {
            const route = response.routes[0];
            const coordinates = route.overview_path.map((p) => ({
              lat: p.lat(),
              lng: p.lng(),
            }));
            resolve(coordinates);
          } else {
            resolve([{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }]);
          }
        }
      );
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Busy');
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error('No route');

    return route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch (error) {
    return [{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }];
  }
};

export default function LiveTracking() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [activeJobs, setActiveJobs] = useState([]);
  const [operatorLocations, setOperatorLocations] = useState({}); // { operatorId: { lat, lng, heading } }
  const [jobRoutes, setJobRoutes] = useState({}); // { jobId: coordinates[] }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [activePopup, setActivePopup] = useState(null); // { type: 'farmer'|'operator'|'device', id: string, opLoc?: object }

  const mapRef = useRef(null);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.admin.getActiveJobs();
        if (res?.success) {
          setActiveJobs(res.data || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load active jobs.');
      } finally {
        setLoading(false);
      }
    };
    loadData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        console.warn('Geolocation failed or denied');
      });
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'], reconnection: true });

    socket.on('connect', () => {
      socket.emit('tracking:join', { role: 'admin' });
    });

    socket.on('location:update', (payload) => {
      if (!payload || !payload.operatorId) return;

      setOperatorLocations(prev => {
        const oldPos = prev[payload.operatorId];
        let heading = 0;
        if (oldPos) {
          // Calculate heading
          const dy = payload.lat - oldPos.lat;
          const dx = Math.cos(oldPos.lat * Math.PI / 180) * (payload.lng - oldPos.lng);
          heading = Math.atan2(dx, dy) * 180 / Math.PI;
        }

        return {
          ...prev,
          [payload.operatorId]: {
            lat: payload.lat,
            lng: payload.lng,
            bookingId: payload.bookingId,
            heading: heading || oldPos?.heading || 0
          }
        };
      });
    });

    socket.on('connect_error', () => setError('Realtime socket disconnected.'));

    return () => {
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => socket.disconnect());
      }
    };
  }, []);

  // Track last known route update points to avoid excessive API calls
  const lastRouteUpdateRef = useRef({}); // { jobId: { lat, lng } }

  // Update routes when jobs or operator movements are detected
  useEffect(() => {
    const updateDynamicRoutes = async () => {
      for (const job of activeJobs) {
        const opLoc = operatorLocations[job.operatorId];
        if (!opLoc || !Number.isFinite(job.farmerLatitude)) continue;

        const lastUpdate = lastRouteUpdateRef.current[job.id];
        const distMoved = lastUpdate ? getDistance(opLoc, lastUpdate) : Infinity;

        // Update if first time or moved > 50m
        if (distMoved > 50) {
          await new Promise(r => setTimeout(r, 800)); // Rate limit
          const route = await getRoute(opLoc, { lat: job.farmerLatitude, lng: job.farmerLongitude });
          setJobRoutes(prev => ({ ...prev, [job.id]: route }));
          lastRouteUpdateRef.current[job.id] = { lat: opLoc.lat, lng: opLoc.lng };
        }
      }
    };
    updateDynamicRoutes();
  }, [activeJobs, operatorLocations]);

  const mapMarkers = useMemo(() => {
    const points = [];
    if (deviceLocation) points.push(deviceLocation);
    activeJobs.forEach(job => {
      if (Number.isFinite(job.farmerLatitude)) {
        points.push({ lat: job.farmerLatitude, lng: job.farmerLongitude });
      }
      const opLoc = operatorLocations[job.operatorId];
      if (opLoc) {
        points.push({ lat: opLoc.lat, lng: opLoc.lng });
      }
    });
    return points;
  }, [activeJobs, operatorLocations, deviceLocation]);

  useEffect(() => {
    if (mapRef.current && mapMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      mapMarkers.forEach((m) => {
        if (m && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
          bounds.extend(m);
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [mapMarkers]);

  if (loadError) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl">Error loading Google Maps.</div>;
  if (!isLoaded || loading) return <div className="p-8 text-center text-earth-brown uppercase font-black text-xs tracking-widest animate-pulse">Scanning Active Missions...</div>;

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-end border-b border-earth-dark/10 pb-4">
        <div>
          <h1 className="text-xl font-black text-earth-brown uppercase italic tracking-tight">Fleet Command Center</h1>
          <p className="text-[10px] font-black text-earth-mut uppercase tracking-widest mt-1">
            Monitoring {activeJobs.length} active service links
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${showAI ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-earth-card text-earth-mut border-earth-dark/10'}`}
          >
            <BrainCircuit size={12} className={showAI ? "animate-pulse" : ""} /> AI Demand Map
          </button>
          <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Link Active
          </span>
        </div>
      </header>

      {error ? <p className="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p> : null}

      <div className="relative z-0 h-[calc(100vh-12rem)] rounded-[2rem] overflow-hidden border border-earth-dark/10 shadow-2xl relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={DEFAULT_CENTER}
          zoom={11}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: false,
          }}
        >
          <AIHeatmapLayer show={showAI} />

          {deviceLocation && (
            <MarkerF
              position={deviceLocation}
              icon={window.google ? {
                url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="%232563eb" stroke="white" stroke-width="2"/></svg>',
                scaledSize: new window.google.maps.Size(16, 16),
                anchor: new window.google.maps.Point(8, 8),
              } : undefined}
              onClick={() => setActivePopup({ type: 'device', id: 'device' })}
            />
          )}

          {activePopup && activePopup.type === 'device' && deviceLocation && (
            <InfoWindowF
              position={deviceLocation}
              onCloseClick={() => setActivePopup(null)}
            >
              <div className="text-[10px] font-black uppercase">You are here</div>
            </InfoWindowF>
          )}

          {activeJobs.map((job) => {
            const opLoc = operatorLocations[job.operatorId];
            const route = jobRoutes[job.id];

            return (
              <Fragment key={job.id}>
                {/* Farmer Fixed Position */}
                {Number.isFinite(job.farmerLatitude) && (
                  <MarkerF
                    position={{ lat: job.farmerLatitude, lng: job.farmerLongitude }}
                    icon={getFarmerIcon()}
                    onClick={() => setActivePopup({ type: 'farmer', id: job.id, extra: job })}
                  />
                )}

                {activePopup && activePopup.type === 'farmer' && activePopup.id === job.id && (
                  <InfoWindowF
                    position={{ lat: job.farmerLatitude, lng: job.farmerLongitude }}
                    onCloseClick={() => setActivePopup(null)}
                  >
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] font-black uppercase text-earth-mut">Client</p>
                      <p className="text-xs font-bold text-earth-brown">{job.farmerName}</p>
                      <p className="text-[10px] text-earth-sub">{job.location}</p>
                      <div className="pt-2 border-t border-earth-dark/5 mt-2">
                        <p className="text-[10px] font-bold text-earth-primary uppercase">Task: {job.serviceName}</p>
                      </div>
                    </div>
                  </InfoWindowF>
                )}

                {/* Operator Live Position */}
                {opLoc && (
                  <MarkerF
                    position={{ lat: opLoc.lat, lng: opLoc.lng }}
                    icon={getTractorIcon(opLoc.heading)}
                    onClick={() => setActivePopup({ type: 'operator', id: job.id, extra: job, opLoc })}
                  />
                )}

                {activePopup && activePopup.type === 'operator' && activePopup.id === job.id && activePopup.opLoc && (
                  <InfoWindowF
                    position={{ lat: activePopup.opLoc.lat, lng: activePopup.opLoc.lng }}
                    onCloseClick={() => setActivePopup(null)}
                  >
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] font-black uppercase text-earth-mut">Operator</p>
                      <p className="text-xs font-bold text-earth-brown">{job.operatorName}</p>
                      <p className="text-[10px] text-earth-sub">Unit: {job.tractorName} ({job.tractorModel})</p>
                      <div className="mt-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                        Live Telemetry Verified
                      </div>
                    </div>
                  </InfoWindowF>
                )}

                {/* Road Route Polyline */}
                {route && route.length > 1 && (
                  <>
                    <Polyline
                      path={route}
                      options={{ strokeColor: '#16a34a', strokeWeight: 6, strokeOpacity: 0.3 }}
                    />
                    <Polyline
                      path={route}
                      options={{ strokeColor: '#10b981', strokeWeight: 2, strokeOpacity: 1, strokeLinejoin: 'round' }}
                    />
                  </>
                )}

                {/* Dashed Connection to target if route not yet loaded */}
                {opLoc && Number.isFinite(job.farmerLatitude) && (!route || route.length === 0) && (
                  <Polyline
                    path={[
                      { lat: opLoc.lat, lng: opLoc.lng },
                      { lat: job.farmerLatitude, lng: job.farmerLongitude }
                    ]}
                    options={{
                      strokeColor: '#dc2626',
                      strokeWeight: 2,
                      strokeOpacity: 0.6,
                      icons: [{
                        icon: {
                          path: 'M 0,-1 0,1',
                          strokeOpacity: 1,
                          scale: 2
                        },
                        offset: '0',
                        repeat: '10px'
                      }]
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </GoogleMap>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-earth-dark/10 shadow-xl space-y-3 min-w-[160px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-earth-mut border-b border-earth-dark/5 pb-2">Legend</p>
          <div className="flex items-center gap-3">
            <span className="text-lg">🚜</span>
            <span className="text-[10px] font-bold text-earth-brown uppercase">Active Tractor (Movement Aware)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg">📍</span>
            <span className="text-[10px] font-bold text-earth-brown uppercase">Target Farm</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] font-bold text-earth-brown uppercase">Active Road Route</span>
          </div>
          
          {showAI && (
            <>
              <div className="pt-2 border-t border-earth-dark/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-purple-500/30 border border-purple-500"></div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">AI Predicted Hotspot</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500/30 border border-orange-500"></div>
                  <span className="text-[10px] font-bold text-orange-700 uppercase">Moderate Peak</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500/30 border border-red-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-red-700 uppercase">Severe Peak</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
