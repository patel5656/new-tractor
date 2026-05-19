import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import 'leaflet/dist/leaflet.css';
import API_BASE_URL from '../../config/api';

const SOCKET_URL = API_BASE_URL;
const DEFAULT_CENTER = { lat: 30.900965, lng: 75.857277 };
const TRACKING_ROOM = 'default-room';

const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const R = 6371e3;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const OPENFREE_TILES = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';
const OSM_FALLBACK_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const tractorIcon = L.divIcon({
  html: '<div style="background:#16a34a;color:#fff;border-radius:12px;padding:8px 10px;font-size:20px;box-shadow:0 4px 14px rgba(0,0,0,.25)">🚜</div>',
  className: '',
  iconSize: [42, 42],
  iconAnchor: [21, 38],
});

const farmerIcon = L.divIcon({
  html: '<div style="background:#dc2626;color:#fff;border-radius:9999px;padding:8px;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.25)">📍</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

const getNavigationArrowIcon = (headingDeg = 0) =>
  L.divIcon({
    html: `<div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid #2563eb;transform: rotate(${headingDeg}deg);filter: drop-shadow(0 2px 4px rgba(0,0,0,.35));"></div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function DestinationPicker({ enabled, onPick }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      const { lat, lng } = event.latlng;
      onPick({ lat, lng });
    },
  });
  return null;
}

function RecenterMap({ center, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    if (!center) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, enabled, map]);
  return null;
}

function FitRouteBounds({ route, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    if (!route || route.length < 2) return;
    map.fitBounds(route, { padding: [40, 40] });
  }, [route, enabled, map]);
  return null;
}

function MapInteractionWatcher({ onManualInteraction }) {
  useMapEvents({
    dragstart() {
      onManualInteraction();
    },
    zoomstart() {
      onManualInteraction();
    },
  });
  return null;
}

// Optimized Marker components to prevent re-renders on parent state changes
const MemoizedOperatorMarker = memo(({ position, icon }) => (
  <Marker position={[position.lat, position.lng]} icon={icon} />
));

const MemoizedFarmerMarker = memo(({ position, icon }) => (
  <Marker position={[position.lat, position.lng]} icon={icon} />
));

const MemoizedPolyline = memo(({ positions, pathOptions }) => (
  <Polyline positions={positions} pathOptions={pathOptions} />
));

function haversineKm(a, b) {
  if (!a || !b) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}

function computeHeadingDeg(from, to) {
  if (!from || !to) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function parsePinnedCoordinates(text) {
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/g);
  if (!match || match.length < 2) return null;
  const lat = Number(match[0]);
  const lng = Number(match[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function normalizeInstruction(step) {
  const modifier = step?.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
  const road = step?.name ? ` onto ${step.name}` : '';
  switch (step?.maneuver?.type) {
    case 'depart':
      return `Start and head${modifier}${road}`.trim();
    case 'arrive':
      return 'You have reached your destination';
    case 'turn':
      return `Turn${modifier}${road}`.trim();
    case 'new name':
      return `Continue${road}`.trim();
    case 'roundabout':
      return `Take the roundabout${road}`.trim();
    default:
      return step?.name ? `Continue on ${step.name}` : 'Continue straight';
  }
}

async function getRoute(start, end) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(routeUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Route service busy');
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error('No route available');

    return {
      distanceKm: (route.distance / 1000).toFixed(2),
      etaMin: Math.ceil(route.duration / 60),
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      instructions: (route.legs?.[0]?.steps || []).map(normalizeInstruction).filter(Boolean).slice(0, 6),
    };
  } catch (err) {
    const dist = haversineKm(start, end);
    return {
      distanceKm: dist.toFixed(2),
      etaMin: Math.ceil((dist / 35) * 60),
      coordinates: [[start.lat, start.lng], [end.lat, end.lng]],
      instructions: ['Follow direct path to destination (Route service offline)'],
    };
  }
}

export default function LiveTrackingMap({
  role,
  bookingId,
  roomId = TRACKING_ROOM,
  className = '',
  enableDestinationPick = false,
  initialDestination = null,
  initialDestinationQuery = '',
  destinationLabel = '',
}) {
  const { user } = useAuth();

  const [operatorLocation, setOperatorLocation] = useState(null);
  const [farmerLocation, setFarmerLocation] = useState(null);



  const [deviceLocation, setDeviceLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [distanceKm, setDistanceKm] = useState('--');
  const [etaMin, setEtaMin] = useState('--');
  const [instructions, setInstructions] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState('--');
  const [remainingEtaMin, setRemainingEtaMin] = useState('--');
  const [statusText, setStatusText] = useState('Initializing map...');

  // Clear map if no destination is provided (e.g. after job completion)
  useEffect(() => {
    if (!initialDestination && !initialDestinationQuery) {
      setFarmerLocation(null);
      setRoute([]);
      setDistanceKm('--');
      setEtaMin('--');
      setRemainingDistanceKm('--');
      setRemainingEtaMin('--');
      setInstructions([]);
      setErrorText('');
    }
  }, [initialDestination, initialDestinationQuery]);
  const [errorText, setErrorText] = useState('');
  const [tileUrl, setTileUrl] = useState(OPENFREE_TILES);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const deviceWatchIdRef = useRef(null);
  const emitGateRef = useRef(0);
  const operatorLocationRef = useRef(null);
  const routeTimerRef = useRef(null);
  const operatorAnimRef = useRef(null);
  const lowAccuracyCooldownRef = useRef(0);
  const hasShownGpsIssueRef = useRef(false);
  const lastRoutePointRef = useRef(null);

  // Smart Centering: midpoint between operator and farmer
  const center = useMemo(() => {
    let point = DEFAULT_CENTER;
    if (operatorLocation && farmerLocation) {
      point = {
        lat: (operatorLocation.lat + farmerLocation.lat) / 2,
        lng: (operatorLocation.lng + farmerLocation.lng) / 2,
      };
    } else {
      point = (role === 'operator')
        ? (operatorLocation || deviceLocation || farmerLocation || DEFAULT_CENTER)
        : (farmerLocation || operatorLocation || deviceLocation || DEFAULT_CENTER);
    }
    const res = [point.lat, point.lng];
    if (!Number.isFinite(res[0]) || !Number.isFinite(res[1])) return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
    return res;
  }, [farmerLocation, operatorLocation, deviceLocation, role]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };

    const onSuccess = (pos) => {
      setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    const onError = (err) => {
      // If high accuracy fails or times out, try again with low accuracy once
      if (err.code === err.TIMEOUT || err.code === err.PERMISSION_DENIED) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => console.debug('Device geolocation fallback failed'),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      }
    };

    deviceWatchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options);

    return () => {
      if (deviceWatchIdRef.current) navigator.geolocation.clearWatch(deviceWatchIdRef.current);
    };
  }, []);

  const emitFarmerDestination = useCallback((location) => {
    if (!socketRef.current || !location) return;
    socketRef.current.emit('farmer:destination:update', {
      roomId,
      bookingId,
      lat: location.lat,
      lng: location.lng,
    });
  }, [roomId, bookingId]);

  useEffect(() => {
    if (!initialDestination) return;
    if (!Number.isFinite(initialDestination.lat) || !Number.isFinite(initialDestination.lng)) return;
    setFarmerLocation({
      lat: Number(initialDestination.lat),
      lng: Number(initialDestination.lng),
    });
    setStatusText(
      destinationLabel
        ? `Route loaded for ${destinationLabel}.`
        : 'Route loaded for assigned destination.'
    );
  }, [initialDestination, destinationLabel]);

  useEffect(() => {
    if (initialDestination) return;
    if (!initialDestinationQuery?.trim()) return;

    const parsedPinned = parsePinnedCoordinates(initialDestinationQuery);
    if (parsedPinned) {
      setFarmerLocation(parsedPinned);
      setStatusText('Destination loaded from pinned coordinates.');
      return;
    }

    const geocodeDestination = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(initialDestinationQuery)}`;
        const response = await fetch(url, {
          headers: { Accept: 'application/json' }
        });
        const data = await response.json();
        const first = data?.[0];
        if (!first) {
          setErrorText('Destination not found from location text.');
          return;
        }
        setFarmerLocation({
          lat: Number(first.lat),
          lng: Number(first.lon),
        });
        setStatusText('Destination resolved from location text.');
      } catch (error) {
        setErrorText('Could not resolve destination location.');
      }
    };

    geocodeDestination();
  }, [initialDestination, initialDestinationQuery]);

  const animateOperator = useCallback((nextPoint) => {
    if (!nextPoint) return;

    // If it's the first point, just set it
    if (!operatorLocationRef.current) {
      operatorLocationRef.current = nextPoint;
      setOperatorLocation(nextPoint);
      return;
    }

    if (operatorAnimRef.current) {
      cancelAnimationFrame(operatorAnimRef.current);
    }

    const start = { ...operatorLocationRef.current };
    const startedAt = performance.now();
    const duration = 1200;

    const step = (ts) => {
      const elapsed = ts - startedAt;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t);

      const current = {
        lat: start.lat + (nextPoint.lat - start.lat) * eased,
        lng: start.lng + (nextPoint.lng - start.lng) * eased,
      };

      operatorLocationRef.current = current;
      setOperatorLocation(current);

      if (t < 1) {
        operatorAnimRef.current = requestAnimationFrame(step);
      }
    };

    operatorAnimRef.current = requestAnimationFrame(step);
  }, []); // Remove operatorLocation dependency

  const scheduleRouteUpdate = useCallback((start, end) => {
    if (!start || !end) return;
    if (routeTimerRef.current) {
      clearTimeout(routeTimerRef.current);
    }

    routeTimerRef.current = setTimeout(async () => {
      try {
        const routeData = await getRoute(start, end);
        setRoute(routeData.coordinates);
        setDistanceKm(routeData.distanceKm);
        setEtaMin(routeData.etaMin);
        setInstructions(routeData.instructions || []);
        lastRoutePointRef.current = start;
      } catch (error) {
        setErrorText(error.message || 'Unable to calculate route.');
      }
    }, 1500);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatusText('Connected. Waiting for live updates...');
      socket.emit('tracking:join', { roomId, role, bookingId, userId: user?.id });
    });

    socket.on('tracking:state', (payload) => {
      if (payload?.operatorLocation) {
        animateOperator(payload.operatorLocation);
      }
      if (payload?.farmerLocation) {
        setFarmerLocation(payload.farmerLocation);
      }
    });

    socket.on('location:update', (payload) => {
      if (!payload) return;
      animateOperator({ lat: payload.lat, lng: payload.lng });
      setStatusText('Operator location updated in real time.');
    });

    socket.on('farmer:destination:update', (payload) => {
      if (!payload) return;
      setFarmerLocation({ lat: payload.lat, lng: payload.lng });
    });

    socket.on('connect_error', () => {
      setErrorText('Socket connection failed. Check backend server.');
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => socket.disconnect());
      }
    };
  }, [animateOperator, role, roomId, bookingId]);

  // Immediate route update on first valid points or significant movement
  useEffect(() => {
    if (!operatorLocation || !farmerLocation) return;

    const distSinceLast = lastRoutePointRef.current
      ? getDistance(operatorLocation, lastRoutePointRef.current)
      : Infinity;

    // Trigger on first load or > 30m movement
    if (route.length === 0 || distSinceLast > 30) {
      scheduleRouteUpdate(operatorLocation, farmerLocation);
    }
  }, [operatorLocation, farmerLocation, route.length, scheduleRouteUpdate]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (role !== 'operator') return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (role === 'operator') {
          animateOperator(point);
          const now = Date.now();
          if (socketRef.current && now - emitGateRef.current > 2000) {
            emitGateRef.current = now;
            socketRef.current.emit('location:update', {
              roomId,
              bookingId,
              operatorId: user?.id,
              lat: point.lat,
              lng: point.lng,
              timestamp: now,
            });
          }
        }
      },
      (error) => {
        if (error.code === 3) {
          const now = Date.now();
          if (now - lowAccuracyCooldownRef.current > 12000 && navigator.geolocation) {
            lowAccuracyCooldownRef.current = now;
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const point = { lat: position.coords.latitude, lng: position.coords.longitude };
                animateOperator(point);
              },
              null,
              { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
            );
          }
        }
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 12000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [animateOperator, role, roomId, bookingId, user?.id]);

  useEffect(() => {
    if (!operatorLocation || !farmerLocation) return;
    scheduleRouteUpdate(operatorLocation, farmerLocation);
  }, [operatorLocation, farmerLocation, scheduleRouteUpdate]);

  useEffect(() => {
    if (!operatorLocation || route.length < 2) return;
    const routePoints = route.map(([lat, lng]) => ({ lat, lng }));
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < routePoints.length; i += 1) {
      const d = haversineKm(operatorLocation, routePoints[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const nextPoint = routePoints[Math.min(nearestIdx + 1, routePoints.length - 1)];
    if (nextPoint) setHeadingDeg(computeHeadingDeg(operatorLocation, nextPoint));
    let remain = 0;
    for (let i = nearestIdx; i < routePoints.length - 1; i += 1) {
      remain += haversineKm(routePoints[i], routePoints[i + 1]);
    }
    setRemainingDistanceKm(remain.toFixed(2));
    setRemainingEtaMin(String(Math.max(1, Math.ceil((remain / 35) * 60))));
  }, [operatorLocation, route]);

  const handleDestinationPick = useCallback((location) => {
    setFarmerLocation(location);
    emitFarmerDestination(location);
  }, [emitFarmerDestination]);

  return (
    <div
      className={cn("relative z-0 w-full flex flex-col overflow-hidden bg-neutral-100", className)}
      style={{ minHeight: '600px', height: '100%' }}
    >
      <div className="absolute z-[1000] top-3 left-3 right-3 md:top-6 md:left-6 md:right-auto md:w-[280px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/50 p-2.5 md:p-3 transition-all duration-300">
        <div className="flex justify-between items-center mb-1.5 md:mb-2 px-1">
          <p className="text-[7px] md:text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em]">{role} mode</p>
          <div className="flex gap-1.5 items-center">
            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-[8px] md:text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{statusText.split('.')[0]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-3">
          <div className="bg-neutral-50/80 p-1.5 md:p-2 rounded-xl border border-neutral-100/50">
            <p className="text-[7px] md:text-[8px] font-bold text-neutral-400 uppercase">Dist</p>
            <p className="text-xs md:text-sm font-black text-neutral-800 tabular-nums">{remainingDistanceKm}<span className="text-[7px] md:text-[8px] ml-0.5 uppercase opacity-40">km</span></p>
          </div>
          <div className="bg-neutral-50/80 p-1.5 md:p-2 rounded-xl border border-neutral-100/50">
            <p className="text-[7px] md:text-[8px] font-bold text-neutral-400 uppercase">ETA</p>
            <p className="text-xs md:text-sm font-black text-neutral-800 tabular-nums">{remainingEtaMin}<span className="text-[7px] md:text-[8px] ml-0.5 uppercase opacity-40">min</span></p>
          </div>
        </div>

        {errorText && (
          <div className="mb-3 p-1.5 bg-red-50/50 rounded-lg border border-red-100 flex items-center gap-2">
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            <p className="text-[9px] font-bold text-red-600 uppercase leading-none">{errorText}</p>
          </div>
        )}

        {instructions.length > 0 && (
          <div className="space-y-2">
            <div className="p-2 md:p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200/50">
              <p className="text-[6px] md:text-[7px] font-bold uppercase opacity-80 tracking-widest text-center mb-0.5 leading-none">Next Command</p>
              <p className="text-[10px] md:text-[11px] font-black text-center leading-tight uppercase tracking-tight">{instructions[0]}</p>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                className="w-full flex justify-between items-center px-2 py-1 text-[7px] md:text-[8px] font-black text-neutral-400 uppercase tracking-widest hover:text-neutral-600 transition-colors"
              >
                <span>Upcoming turns</span>
                <span className="text-[6px]">{isInstructionsExpanded ? "Collapse" : "Expand"}</span>
              </button>

              {isInstructionsExpanded && (
                <div className="max-h-[80px] md:max-h-[120px] overflow-y-auto pr-1.5 scrollbar-hide animate-in fade-in slide-in-from-top-1 duration-200">
                  <ul className="space-y-1.5 py-1">
                    {instructions.slice(1).map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 group px-1 border-l-2 border-neutral-100 hover:border-blue-200 transition-colors py-0.5">
                        <span className="text-[8px] font-black text-neutral-300 mt-0.5">{idx + 2}</span>
                        <p className="text-[9px] font-bold text-neutral-500 leading-tight group-hover:text-neutral-800 transition-colors uppercase tracking-tight">{step}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAutoFollow((prev) => !prev)}
          className={cn(
            "mt-2 md:mt-3 w-full h-8 rounded-xl border text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
            isAutoFollow
              ? "bg-neutral-900 text-white border-neutral-900 shadow-md md:shadow-lg shadow-neutral-200"
              : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
          )}
        >
          {isAutoFollow ? 'Focus Locked' : 'Unlock Map'}
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        className="w-full flex-1"
        style={{ height: '600px', minHeight: '600px' }}
      >
        <TileLayer
          url={tileUrl}
          eventHandlers={{
            tileerror: () => {
              // Only fallback once to avoid infinite update loops
              if (tileUrl !== OSM_FALLBACK_TILES) {
                setTileUrl(OSM_FALLBACK_TILES);
              }
            }
          }}
        />
        <RecenterMap center={center} enabled={isAutoFollow} />
        <FitRouteBounds route={route} enabled={isAutoFollow} />
        <MapInteractionWatcher onManualInteraction={() => setIsAutoFollow(false)} />
        <DestinationPicker enabled={enableDestinationPick} onPick={handleDestinationPick} />

        {deviceLocation && (
          <Marker position={[deviceLocation.lat, deviceLocation.lng]}>
            <Popup>
              <div className="text-[10px] font-black uppercase">You are here</div>
            </Popup>
          </Marker>
        )}

        {operatorLocation && (
          <MemoizedOperatorMarker
            position={operatorLocation}
            icon={isNavigating ? getNavigationArrowIcon(headingDeg) : tractorIcon}
          />
        )}

        {farmerLocation && (
          <MemoizedFarmerMarker position={farmerLocation} icon={farmerIcon} />
        )}

        {route.length > 1 && (
          <>
            <MemoizedPolyline
              positions={route}
              pathOptions={{ color: '#2563eb', weight: 8, opacity: 0.4 }}
            />
            <MemoizedPolyline
              positions={route}
              pathOptions={{ color: '#3b82f6', weight: 4, opacity: 1, lineJoin: 'round' }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
