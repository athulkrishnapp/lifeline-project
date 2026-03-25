import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTimes, FaTrash, FaCheck, FaBellSlash } from 'react-icons/fa';

const Notification = ({ onClose, onUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread'); 

  // 1. FETCH FROM DB
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await axios.get('http://localhost:5000/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
        setLoading(false);
    } catch (err) { setLoading(false); }
  };

  // 2. ACTIONS
  const markRead = async (id) => {
    const token = localStorage.getItem('token');
    await axios.put('http://localhost:5000/api/notifications/read', { id }, { headers: { Authorization: `Bearer ${token}` } });
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    if(onUpdate) onUpdate(); 
  };

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    await axios.put('http://localhost:5000/api/notifications/read', { all: true }, { headers: { Authorization: `Bearer ${token}` } });
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    if(onUpdate) onUpdate();
  };

  const deleteNote = async (id) => {
    const token = localStorage.getItem('token');
    await axios.delete(`http://localhost:5000/api/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    
    setNotifications(prev => prev.filter(n => n.id !== id));
    if(onUpdate) onUpdate();
  };

  // 3. HELPERS
  const getIcon = (type) => {
    switch(type) {
        case 'warning': return <FaExclamationTriangle className="text-warning"/>;
        case 'success': return <FaCheckCircle className="text-success"/>;
        case 'danger': return <FaExclamationTriangle className="text-danger"/>; // Updated for emergency alerts
        default: return <FaInfoCircle className="text-primary"/>;
    }
  };

  const formatTime = (dateString) => {
    if(!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); 
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  // Determines the background color based on read status and notification type
  const getRowStyle = (n) => {
      if (n.is_read) return 'bg-white opacity-75';
      if (n.type === 'danger') return 'bg-danger bg-opacity-10'; // Red tint for unread emergencies
      return 'bg-blue-light'; // Blue tint for standard unread
  };

  // 4. FILTER LOGIC
  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => n.is_read === 0) 
    : notifications;

  return (
    <div className="position-absolute top-100 end-0 mt-2 p-0 shadow-lg rounded-4 bg-white border theme-border overflow-hidden animate-fade-in" style={{ width: '360px', zIndex: 1050 }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
        <h6 className="fw-bold m-0 theme-text">Notifications ({notifications.filter(n => n.is_read === 0).length})</h6>
        <div className="d-flex gap-2">
            <button onClick={markAllRead} className="btn btn-xs btn-outline-primary rounded-pill" style={{fontSize:'10px'}}>Mark All Read</button>
            <button onClick={onClose} className="btn btn-sm btn-icon text-muted"><FaTimes/></button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="d-flex border-bottom bg-white">
        <button 
            className={`flex-fill btn btn-sm rounded-0 border-0 fw-bold py-2 ${filter === 'unread' ? 'text-primary border-bottom border-primary border-2' : 'text-muted'}`}
            onClick={() => setFilter('unread')}
        >
            Unread
        </button>
        <button 
            className={`flex-fill btn btn-sm rounded-0 border-0 fw-bold py-2 ${filter === 'all' ? 'text-primary border-bottom border-primary border-2' : 'text-muted'}`}
            onClick={() => setFilter('all')}
        >
            All
        </button>
      </div>

      {/* LIST */}
      <div className="notification-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {loading ? <div className="p-4 text-center small text-muted">Loading...</div> : 
         displayedNotifications.length > 0 ? (
          displayedNotifications.map((n) => (
            <div key={n.id} className={`p-3 border-bottom d-flex align-items-start gap-3 ${getRowStyle(n)}`}>
              <div className="mt-1">{getIcon(n.type)}</div>
              <div className="flex-grow-1">
                <p className={`small m-0 theme-text ${n.is_read ? '' : 'fw-bold'}`}>{n.message}</p>
                <small className="text-muted" style={{fontSize: '10px'}}>{formatTime(n.created_at)}</small>
              </div>
              <div className="d-flex flex-column gap-1">
                {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="btn btn-sm text-primary p-0" title="Mark as Read">
                        <FaCheck size={12}/>
                    </button>
                )}
                <button onClick={() => deleteNote(n.id)} className="btn btn-sm text-danger p-0" title="Delete">
                    <FaTrash size={12}/>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-5 text-center text-muted">
            <FaBellSlash size={24} className="mb-2 opacity-50"/>
            <br/>
            <small>No {filter === 'unread' ? 'unread' : ''} notifications</small>
          </div>
        )}
      </div>
      
      <style>{`.bg-blue-light { background-color: #f0f9ff; } .btn-xs { padding: 2px 8px; font-size: 10px; }`}</style>
    </div>
  );
};

export default Notification;