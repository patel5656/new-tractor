import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const auth = useAuth() || {};
  const { role } = auth;
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1 });
  const [totalCount, setTotalCount] = useState(0);

  const fetchBookings = async (params = {}) => {
    try {
      setLoading(true);
      let result;
      if (role === 'admin') {
        result = await api.admin.listBookings(params);
      } else {
        result = await api.farmer.listBookings(params);
      }

      if (result.success) {
        // Handle both paginated and non-paginated responses
        if (result.data && (result.data.bookings || result.data.data)) {
          const bookingData = result.data.bookings || result.data.data;
          const paginationData = result.data.pagination || {
            totalPages: result.data.totalPages,
            currentPage: result.data.currentPage,
            totalCount: result.data.totalCount
          };
          
          setBookings(bookingData);
          setPagination({
            totalPages: paginationData.totalPages || 1,
            currentPage: paginationData.currentPage || 1
          });
          setTotalCount(paginationData.totalCount || bookingData.length);
        } else {
          setBookings(Array.isArray(result.data) ? result.data : []);
          setPagination({ totalPages: 1, currentPage: 1 });
          setTotalCount(Array.isArray(result.data) ? result.data.length : 0);
        }
        
        // Save to cache for farmer
        if (role === 'farmer') {
          localStorage.setItem('farmerBookingHistory', JSON.stringify(result));
        }
      }
    } catch (error) {
      if (role === 'farmer') {
        const cached = localStorage.getItem('farmerBookingHistory');
        if (cached) {
          try {
            const result = JSON.parse(cached);
            if (result.data && (result.data.bookings || result.data.data)) {
              const bookingData = result.data.bookings || result.data.data;
              const paginationData = result.data.pagination || {
                totalPages: result.data.totalPages,
                currentPage: result.data.currentPage,
                totalCount: result.data.totalCount
              };
              setBookings(bookingData);
              setPagination({
                totalPages: paginationData.totalPages || 1,
                currentPage: paginationData.currentPage || 1
              });
              setTotalCount(paginationData.totalCount || bookingData.length);
            } else {
              setBookings(Array.isArray(result.data) ? result.data : []);
              setPagination({ totalPages: 1, currentPage: 1 });
              setTotalCount(Array.isArray(result.data) ? result.data.length : 0);
            }
            return; // Exit successfully using cache
          } catch (e) {
            console.error('Failed to parse cached bookings');
          }
        }
      }

      if (!error.message || !error.message.includes('permission')) {
        console.error('Failed to fetch bookings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'farmer' || role === 'admin') {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [role]);

  const addBooking = (newBooking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const updateBookingStatus = (id, status) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const updatePaymentStatus = (id, paymentStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentStatus } : b));
  };

  const deleteBooking = (id) => {
    // Operation restricted as per PRD: Remove completely
    console.warn('Booking deletion is disabled for stability.');
  };

  const assignTractor = (id, tractorId) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, tractorId, status: 'In Progress' } : b));
  };

  const value = {
    bookings,
    pagination,
    totalCount,
    loading,
    fetchBookings,
    addBooking,
    updateBookingStatus,
    updatePaymentStatus,
    deleteBooking,
    assignTractor
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
};
