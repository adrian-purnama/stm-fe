import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogOut, Home, User, Bell, BellOff, Check, ExternalLink, Clock, X } from 'lucide-react';
import { UserContext } from '../../utils/contexts/UserContext';
import { NotificationsContext } from '../../utils/contexts/NotificationsContext';

const Navigation = ({ title = "ASB Dashboard", subtitle = null, children = null }) => {
  const { user, logoutUser } = useContext(UserContext);
  const { connected, notifications, unreadCount, loadMore, hasMore, markAsRead, refresh } = useContext(NotificationsContext);
  const [open, setOpen] = useState(false);
  const toggleOpen = () => setOpen(o => !o);
  const navigate = useNavigate();


  const handleLogout = () => {
    logoutUser();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  // Show different navigation based on login status
  if (!user.isLoggedIn) {
    return (
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img src="/asb logo new.png" alt="asb-logo" className='w-[100px]' />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium border-2 border-red-600"
              >
                Daftar
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div>
              {/* <h1 className="text-3xl font-bold text-gray-900">{title}</h1> */}
              <img src="/asb logo new.png" alt="asb-logo" className='w-[100px]' />
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
                  <div className="flex items-center space-x-4">
                    {children}
                    
                    {/* Notifications */}
                    <div className="relative">
                      <button onClick={toggleOpen} title={connected ? 'Notifications connected' : 'Notifications disconnected'} className={`p-2 ${connected ? 'text-green-600' : 'text-gray-400'} rounded-md`}>
                        {connected ? <Bell size={20} /> : <BellOff size={20} />}
                      </button>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
                          {Math.min(99, unreadCount)}
                        </span>
                      )}
                      {open && (
                        <div className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                          {/* Header */}
                          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-2">
                              <Bell size={18} className="text-blue-600" />
                              <h3 className="font-semibold text-gray-900">Notifications</h3>
                              {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            <button onClick={toggleOpen} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                              <X size={16} className="text-gray-500" />
                            </button>
                          </div>

                          {/* Notifications List */}
                          <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 px-4">
                                <Bell size={48} className="text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">No notifications yet</p>
                                <p className="text-sm text-gray-400 mt-1">You'll see updates here when they arrive</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {notifications.map((n) => (
                                  <div key={n._id || n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''}`}>
                                    <div className="flex items-start gap-3">
                                      {/* Notification Icon */}
                                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!n.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Bell size={16} />
                                      </div>
                                      
                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <h4 className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                              {n.title}
                                            </h4>
                                            {n.description && (
                                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {n.description}
                                              </p>
                                            )}
                                            
                                            {/* Time and Actions */}
                                            <div className="flex items-center justify-between mt-2">
                                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Clock size={12} />
                                                <span>{new Date(n.createdAt || Date.now()).toLocaleDateString()} at {new Date(n.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                {n.link && (
                                                  <a 
                                                    href={n.link} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                                  >
                                                    <ExternalLink size={12} />
                                                    Open
                                                  </a>
                                                )}
                                                {!n.isRead && (
                                                  <button 
                                                    onClick={() => markAsRead(n._id || n.id)} 
                                                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline"
                                                  >
                                                    <Check size={12} />
                                                    Mark read
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          {notifications.length > 0 && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                              {hasMore ? (
                                <button 
                                  onClick={loadMore} 
                                  className="w-full text-sm font-medium text-gray-700 hover:text-gray-900 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  Load more notifications
                                </button>
                              ) : (
                                <div className="text-xs text-gray-500 text-center py-1">
                                  You've reached the end
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Home Link */}
                    <button
                      onClick={() => navigate('/')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Home"
                    >
                      <Home size={20} />
                    </button>
                    
                    {/* Profile Link */}
                    <button
                      onClick={() => navigate('/profile')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Profile"
                    >
                      <User size={20} />
                    </button>
                    
                    <div className="text-sm text-gray-500">
                      Selamat Datang, <span className="font-medium text-gray-900">{user.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Keluar
                    </button>
                  </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
