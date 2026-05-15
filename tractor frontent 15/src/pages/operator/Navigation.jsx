import LiveTrackingMap from '../../components/map/LiveTrackingMap';
import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Navigation() {
  const location = useLocation();
  const [fallbackDestination, setFallbackDestination] = useState(null);
  const [fallbackDestinationQuery, setFallbackDestinationQuery] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [noActiveJob, setNoActiveJob] = useState(false);

  const syncJobStatus = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsValidating(true);
      const res = await api.operator.getJobs();
      const activeJob = res?.data?.current_job;
      
      if (activeJob) {
        setNoActiveJob(false);
        if (Number.isFinite(activeJob.farmerLatitude) && Number.isFinite(activeJob.farmerLongitude)) {
          setFallbackDestination({
            lat: Number(activeJob.farmerLatitude),
            lng: Number(activeJob.farmerLongitude),
            label: activeJob.location || 'Assigned destination',
          });
        } else if (activeJob?.location) {
          setFallbackDestinationQuery(activeJob.location);
        }
      } else {
        // No active job found in backend
        setNoActiveJob(true);
        setFallbackDestination(null);
        setFallbackDestinationQuery('');
      }
    } catch (error) {
      console.error('Failed to load navigation destination:', error);
    } finally {
      if (isInitial) setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    // Initial sync
    syncJobStatus(true);

    // Auto-sync every 10 seconds
    const interval = setInterval(() => syncJobStatus(false), 10000);

    // Sync on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncJobStatus(false);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncJobStatus]);

  // Override location state if we've verified there's no active job
  const destination = noActiveJob ? null : (location.state?.destination || fallbackDestination);
  const destinationQuery = noActiveJob ? '' : (location.state?.destinationQuery || fallbackDestinationQuery);
  const destinationLabel = noActiveJob ? '' : (location.state?.destinationLabel || fallbackDestination?.label || '');
  const { bookingId } = noActiveJob ? {} : (location.state || {});

  if (isValidating) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900 text-white font-black uppercase tracking-widest text-xs">
        Verifying Mission Status...
      </div>
    );
  }

  return (
    <LiveTrackingMap
      role="operator"
      className="h-full lg:h-[calc(100vh-4rem)]"
      bookingId={bookingId}
      initialDestination={destination}
      initialDestinationQuery={destinationQuery}
      destinationLabel={destinationLabel}
    />
  );
}
