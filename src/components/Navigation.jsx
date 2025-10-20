import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogOut, Home, User } from 'lucide-react';
import { UserContext } from '../utils/UserContext';

const Navigation = ({ title = "ASB Dashboard", subtitle = null, children = null }) => {
  const { user, logoutUser } = useContext(UserContext);
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
              <img src="/asb logo.png" alt="asb-logo" className='w-[100px]' />
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
              <img src="/asb logo.png" alt="asb-logo" className='w-[100px]' />
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
                  <div className="flex items-center space-x-4">
                    {children}
                    
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
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {user.role}
                      </span>
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
