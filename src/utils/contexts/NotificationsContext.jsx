import { createContext, useEffect, useRef, useState, useContext } from 'react';
import axiosInstance from '../api/ApiHelper';
import toast from 'react-hot-toast';
import { UserContext } from './UserContext';

export const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const scheduleReconnect = () => {
    if (!shouldReconnectRef.current) return;

    clearReconnectTimer();
    reconnectAttemptsRef.current += 1;
    const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));

    reconnectTimerRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  const connectWebSocket = () => {
    if (!user.isLoggedIn) {
      return;
    }

    const env = import.meta.env.VITE_NODE_ENV || import.meta.env.VITE_NODE_ENV_BUILD || 'development';
    const wsProtocol = (env === 'preprod' || env === 'production') ? 'wss://' : 'ws://';
    const wsHost = import.meta.env.VITE_BACKEND_URL;
    const wsUrl = `${wsProtocol}${wsHost}/notification`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        clearReconnectTimer();
      };

      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
          if (data.type === 'notification' && data.payload) {
            setNotifications((prev) => [data.payload, ...prev].slice(0, 50));
          }
        } catch (e) {
          // ignore parse errors
        }
      };
    } catch (error) {
      setConnected(false);
      scheduleReconnect();
    }
  };

  const refresh = async () => {
    try {
      const res = await axiosInstance.get('/api/notifications', { params: { page: 1, limit: 10 } });
      const items = res.data?.data?.items || [];
      const pagination = res.data?.data?.pagination || {};
      setNotifications(items);
      setPage(1);
      setHasMore((pagination.page || 1) < (pagination.pages || 1));
      const cnt = await axiosInstance.get('/api/notifications/unread-count');
      setUnreadCount(cnt.data?.data?.count || 0);
    } catch (e) {
      console.error('❌ Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    shouldReconnectRef.current = user.isLoggedIn;

    if (user.isLoggedIn) {
      connectWebSocket();
    }

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user.isLoggedIn]);

  // Initial fetch of paginated notifications and unread count (also handled on ws open)
  useEffect(() => {
    if (!user.isLoggedIn) return;
    refresh();
  }, [user.isLoggedIn]);

  // When new WS notification arrives, prepend and bump unread
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last?.type === 'notification' && last.payload) {
      setNotifications(prev => [last.payload, ...prev]);
      // show 5s popup
      const t = last.payload.title || 'Notification';
      const d = last.payload.description || '';
      toast(`${t}${d ? ': ' + d : ''}`, { duration: 5000 });
      setUnreadCount(prev => prev + 1);
    }
  }, [messages]);

  const loadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    const res = await axiosInstance.get('/api/notifications', { params: { page: nextPage, limit: 10 } });
    const items = res.data?.data?.items || [];
    const pagination = res.data?.data?.pagination || {};
    setNotifications(prev => [...prev, ...items]);
    setPage(nextPage);
    setHasMore((pagination.page || nextPage) < (pagination.pages || nextPage));
  };

  const markAsRead = async (id) => {
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('❌ Error marking notification as read:', e);
    }
  };

  return (
    <NotificationsContext.Provider value={{ connected, messages, notifications, unreadCount, loadMore, hasMore, markAsRead, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
};


