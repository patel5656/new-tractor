import React, { useEffect, useState } from 'react';
import { CircleF, InfoWindowF } from '@react-google-maps/api';
import { api } from '../../../lib/api';

const DEFAULT_HEATMAP_CENTER = { lat: 30.900965, lng: 75.857277 };

export default function AIHeatmapLayer({ show = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!show) {
      setData(null);
      setInfoOpen(false);
      return;
    }

    const fetchForecast = async () => {
      setLoading(true);
      try {
        const resData = await api.admin.getDemandForecast();
        if (resData.success) {
          setData(resData.data);
          setInfoOpen(true); // Open info popup automatically on load
        }
      } catch (error) {
        console.error('AI Forecast fetch failed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [show]);

  if (!show) return null;

  const heatmapCenter = (data && data.topZoneLat && data.topZoneLng) 
    ? { lat: data.topZoneLat, lng: data.topZoneLng }
    : DEFAULT_HEATMAP_CENTER;

  return (
    <>
      <CircleF
        center={heatmapCenter}
        radius={20000}
        options={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.08,
          strokeWeight: 1,
          clickable: false
        }}
      />

      <CircleF
        center={heatmapCenter}
        radius={15000}
        onClick={() => setInfoOpen(true)}
        options={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.25,
          strokeWeight: 2,
        }}
      />

      <CircleF
        center={heatmapCenter}
        radius={5000}
        options={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.4,
          strokeWeight: 0,
          clickable: false
        }}
      />

      {infoOpen && (
        <InfoWindowF
          position={heatmapCenter}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div style={{ minWidth: '180px', padding: '8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 0 3px rgba(239,68,68,0.3)',
              }} />
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                AI Predicted Hotspot
              </span>
            </div>

            {loading ? (
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>Loading AI data...</p>
            ) : data ? (
              <>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>
                  High Demand Zone
                </p>
                <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '6px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '700' }}>Peak Zone</p>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: '#1f2937' }}>{data.topZone}</p>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '6px' }}>
                  <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '700' }}>Top Service</p>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>{data.topService}</p>
                </div>
                <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '6px' }}>
                  Predicted demand peak for next 24-48 hrs
                </p>
              </>
            ) : (
              <p style={{ fontSize: '11px', color: '#ef4444' }}>Could not load AI data. Check backend.</p>
            )}
          </div>
        </InfoWindowF>
      )}
    </>
  );
}

