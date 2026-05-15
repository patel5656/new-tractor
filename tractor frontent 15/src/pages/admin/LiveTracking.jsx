import { useEffect, useMemo, useState, Fragment, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, Polyline } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import { api } from '../../lib/api';
import 'leaflet/dist/leaflet.css';
import API_BASE_URL from '../../config/api';

const SOCKET_URL = API_BASE_URL;
const OPENFREE_TILES = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';
const OSM_FALLBACK_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_CENTER = { lat: 30.900965, lng: 75.857277 };

const farmerPinIcon = L.divIcon({
  html: '<div style="background:#dc2626;color:white;border-radius:9999px;padding:8px 10px;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.25)">📍</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

const getDistance = (p1, p2) => {
  const R = 6371e3; // metres
  const φ1 = p1.lat * Math.PI/180;
  const φ2 = p2.lat * Math.PI/180;
  const Δφ = (p2.lat-p1.lat) * Math.PI/180;
  const Δλ = (p2.lng-p1.lng) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in metres
};

const getTractorIcon = (heading = 0) => L.divIcon({
  html: `<div style="transform: rotate(${heading}deg); transition: transform 0.5s ease; background:#16a34a; color:#fff; border-radius:12px; padding:6px; font-size:20px; box-shadow:0 4px 14px rgba(0,0,0,.25); display: flex; items-center; justify-center;">🚜</div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const getRoute = async (start, end) => {
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

    return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch (error) {
    return [[start.lat, start.lng], [end.lat, end.lng]];
  }
};

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [markers, map]);
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng]);
  }, [center]);
  return null;
}

export default function LiveTracking() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [operatorLocations, setOperatorLocations] = useState({}); // { operatorId: { lat, lng, heading } }
  const [jobRoutes, setJobRoutes] = useState({}); // { jobId: coordinates[] }
  const [error, setError] = useState('');
  const [tileUrl, setTileUrl] = useState(OPENFREE_TILES);
  const [loading, setLoading] = useState(true);
  const [deviceLocation, setDeviceLocation] = useState(null);

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

  const allMarkers = useMemo(() => {
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

  const initialCenter = useMemo(() => {
    if (allMarkers.length > 0) return [allMarkers[0].lat, allMarkers[0].lng];
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  }, [allMarkers]);

  if (loading) return <div className="p-8 text-center text-earth-brown uppercase font-black text-xs tracking-widest">Scanning Active Missions...</div>;

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
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Link Active
            </span>
        </div>
      </header>

      {error ? <p className="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p> : null}
      
      <div className="relative z-0 h-[calc(100vh-12rem)] rounded-[2rem] overflow-hidden border border-earth-dark/10 shadow-2xl relative">
        <MapContainer center={initialCenter} zoom={11} className="w-full h-full" scrollWheelZoom>
          <TileLayer
            attribution="&copy; OpenFreeMap contributors"
            url={tileUrl}
            eventHandlers={{
              tileerror: () => {
                if (tileUrl !== OSM_FALLBACK_TILES) {
                  setTileUrl(OSM_FALLBACK_TILES);
                  setError('');
                }
              },
            }}
          />
          
          <FitBounds markers={allMarkers} />
          <RecenterMap center={deviceLocation} />

          {deviceLocation && (
             <Marker
                position={[deviceLocation.lat, deviceLocation.lng]}
                icon={L.divIcon({
                  html: '<div style="background:#2563eb;color:white;border-radius:9999px;padding:5px;width:12px;height:12px;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3)"></div>',
                  className: '',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>
                  <div className="text-[10px] font-black uppercase">You are here</div>
                </Popup>
              </Marker>
          )}

          {activeJobs.map((job) => {
            const opLoc = operatorLocations[job.operatorId];
            const route = jobRoutes[job.id];

            return (
              <Fragment key={job.id}>
                {/* Farmer Fixed Position */}
                {Number.isFinite(job.farmerLatitude) && (
                  <Marker
                    position={[job.farmerLatitude, job.farmerLongitude]}
                    icon={farmerPinIcon}
                  >
                    <Popup>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-earth-mut">Client</p>
                        <p className="text-xs font-bold text-earth-brown">{job.farmerName}</p>
                        <p className="text-[10px] text-earth-sub">{job.location}</p>
                        <div className="pt-2 border-t border-earth-dark/5 mt-2">
                           <p className="text-[10px] font-bold text-earth-primary uppercase">Task: {job.serviceName}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Operator Live Position */}
                {opLoc && (
                  <Marker
                    position={[opLoc.lat, opLoc.lng]}
                    icon={getTractorIcon(opLoc.heading)}
                  >
                    <Popup>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-earth-mut">Operator</p>
                        <p className="text-xs font-bold text-earth-brown">{job.operatorName}</p>
                        <p className="text-[10px] text-earth-sub">Unit: {job.tractorName} ({job.tractorModel})</p>
                        <div className="mt-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                           Live Telemetry Verified
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Road Route Polyline */}
                {route && route.length > 1 && (
                  <>
                    <Polyline 
                      positions={route}
                      pathOptions={{ color: '#16a34a', weight: 6, opacity: 0.3 }}
                    />
                    <Polyline 
                      positions={route}
                      pathOptions={{ color: '#10b981', weight: 2, opacity: 1, lineJoin: 'round' }}
                    />
                  </>
                )}

                {/* Dashed Connection to target if route not yet loaded */}
                {opLoc && Number.isFinite(job.farmerLatitude) && (!route || route.length === 0) && (
                  <Polyline 
                    positions={[
                      [opLoc.lat, opLoc.lng],
                      [job.farmerLatitude, job.farmerLongitude]
                    ]}
                    pathOptions={{ 
                      color: '#dc2626', 
                      weight: 2, 
                      dashArray: '10, 10', 
                      opacity: 0.6 
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </MapContainer>

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
              <div className="w-8 h-1 bg-earth-green rounded-full"></div>
              <span className="text-[10px] font-bold text-earth-brown uppercase">Active Road Route</span>
           </div>
        </div>
      </div>
    </div>
  );
}
