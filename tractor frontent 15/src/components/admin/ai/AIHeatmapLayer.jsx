import React, { useEffect, useState, Fragment } from 'react';
import { CircleF, InfoWindowF } from '@react-google-maps/api';
import { api } from '../../../lib/api';

const DEFAULT_HEATMAP_CENTER = { lat: 30.900965, lng: 75.857277 };

export default function AIHeatmapLayer({ show = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  useEffect(() => {
    if (!show) {
      setData(null);
      setSelectedHotspot(null);
      return;
    }

    const fetchHeatmap = async () => {
      setLoading(true);
      try {
        const resData = await api.ai.getHeatmap();
        if (resData.success) {
          setData(resData.data);
          if (resData.data && resData.data.length > 0) {
            // Open the highest peak hotspot automatically
            setSelectedHotspot(resData.data[0]);
          }
        }
      } catch (error) {
        console.error('AI Heatmap fetch failed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmap();
  }, [show]);

  if (!show) return null;

  return (
    <>
      {data && data.map((hotspot, idx) => {
        const center = { lat: hotspot.latitude, lng: hotspot.longitude };
        // Determine radius size relative to the peak demand score (higher score = wider hotspot area)
        const radiusVal = Math.max(5000, (hotspot.weight || 50) * 150);

        return (
          <Fragment key={idx}>
            {/* Outer Low Opacity Pulse Circle */}
            <CircleF
              center={center}
              radius={radiusVal * 1.5}
              options={{
                strokeColor: '#a855f7',
                strokeOpacity: 0.15,
                strokeWeight: 1,
                fillColor: '#a855f7',
                fillOpacity: 0.05,
                clickable: false
              }}
            />

            {/* Middle Interactive Zone Circle */}
            <CircleF
              center={center}
              radius={radiusVal}
              onClick={() => setSelectedHotspot(hotspot)}
              options={{
                strokeColor: '#a855f7',
                strokeOpacity: 0.5,
                strokeWeight: 2,
                fillColor: '#a855f7',
                fillOpacity: 0.18,
                cursor: 'pointer'
              }}
            />

            {/* Inner High Density Core Circle */}
            <CircleF
              center={center}
              radius={radiusVal * 0.3}
              options={{
                strokeWeight: 0,
                fillColor: '#a855f7',
                fillOpacity: 0.35,
                clickable: false
              }}
            />
          </Fragment>
        );
      })}

      {selectedHotspot && (
        <InfoWindowF
          position={{ lat: selectedHotspot.latitude, lng: selectedHotspot.longitude }}
          onCloseClick={() => setSelectedHotspot(null)}
        >
          <div style={{ minWidth: '200px', padding: '10px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: '#a855f7',
                boxShadow: '0 0 0 3px rgba(168,85,247,0.3)',
              }} />
              <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                AI Predicted Hotspot
              </span>
            </div>

            {loading ? (
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>Analyzing telemetry...</p>
            ) : (
              <>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#7e22ce', marginBottom: '4px' }}>
                  {selectedHotspot.locationName}
                </p>
                <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '8px' }}>
                  High Demand Core Zone
                </p>
                
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }}>
                  <div style={{ background: '#f3e8ff', borderRadius: '8px', padding: '6px', flex: 1 }}>
                    <p style={{ fontSize: '9px', color: '#7e22ce', textTransform: 'uppercase', fontWeight: '800', margin: 0 }}>Peak Score</p>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#1f2937', margin: '2px 0 0 0' }}>{selectedHotspot.weight}%</p>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '6px', flex: 1 }}>
                    <p style={{ fontSize: '9px', color: '#166534', textTransform: 'uppercase', fontWeight: '800', margin: 0 }}>Bookings</p>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#1f2937', margin: '2px 0 0 0' }}>{selectedHotspot.bookingCount}</p>
                  </div>
                </div>

                <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '5px' }}>
                  <p style={{ fontSize: '9px', color: '#b45309', fontWeight: '800', margin: 0 }}>Est. Revenue</p>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#78350f', margin: 0 }}>₦ {selectedHotspot.revenue.toLocaleString()}</p>
                </div>

                <p style={{ fontSize: '8px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic' }}>
                  Recommended high tractor density sector
                </p>
              </>
            )}
          </div>
        </InfoWindowF>
      )}
    </>
  );
}
