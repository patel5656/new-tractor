import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import API_BASE_URL from '../config/api';

const NotificationContext = createContext();

const SOCKET_URL = API_BASE_URL;

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.notifications.list();
      const list = Array.isArray(response.data) ? response.data : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('[NotificationContext] Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket Connection for Real-time Notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    const socket = io(SOCKET_URL, {
      // Start with polling — avoids "WebSocket closed before established"
      // warning in React 18 Strict Mode (double-effect invocation).
      // Socket.IO automatically upgrades to WebSocket after the first poll.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (cancelled) return;
      socket.emit('tracking:join', {
        userId: user.id,
        role: user.role,
        farmerId: user.role === 'farmer' ? user.id : undefined,
        operatorId: user.role === 'operator' ? user.id : undefined,
      });
    });

    socket.on('connect_error', (err) => {
      if (cancelled) return;
      console.warn('[NotificationContext] Socket connection error:', err.message);
    });

    socket.on('notification:new', (notification) => {
      if (cancelled) return;
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      cancelled = true;
      socket.off('connect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  const markAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[NotificationContext] Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[NotificationContext] Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.notifications.delete(id);
      setNotifications(prev => {
        const remaining = prev.filter(n => n.id !== id);
        setUnreadCount(remaining.filter(n => !n.isRead).length);
        return remaining;
      });
    } catch (error) {
      console.error('[NotificationContext] Failed to delete notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.notifications.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('[NotificationContext] Failed to clear all notifications:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
