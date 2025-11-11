import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/api/ApiHelper';
import { UserContext } from '../../utils/contexts/UserContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const navigate = useNavigate();
  const { loginUser } = useContext(UserContext);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/login', formData);
      if (response.data.success) {
        const userPayload = response.data.data.user;
        const normalizedUser = {
          ...userPayload,
          permissions: Array.isArray(userPayload.permissions)
            ? userPayload.permissions.map((perm) => perm.name || perm)
            : []
        };
        loginUser(normalizedUser, response.data.data.token);
        toast.success('Login berhasil!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Masukkan email terdaftar Anda');
      return;
    }
    setForgotLoading(true);
    try {
      await axiosInstance.post('/api/auth/forgot-password', { email: forgotEmail });
      toast.success('Jika email terdaftar, OTP telah dikirim.');
      navigate(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengirim OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showForgot ? 'Lupa kata sandi' : 'Masuk ke akun Anda'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showForgot ? (
              <button
                type="button"
                className="font-medium text-red-600 hover:text-red-500"
                onClick={() => setShowForgot(false)}
              >
                Kembali ke halaman masuk
              </button>
            ) : (
              <>
                Atau{' '}
                <Link
                  to="/register"
                  className="font-medium text-red-600 hover:text-red-500"
                >
                  buat akun baru
                </Link>
              </>
            )}
          </p>
        </div>

        {showForgot ? (
          <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="forgot-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                  placeholder="Alamat email terdaftar"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forgotLoading ? 'Mengirim...' : 'Kirim OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                  placeholder="Alamat email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                  placeholder="Kata sandi"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(formData.email);
                  setShowForgot(true);
                }}
                className="text-red-600 hover:text-red-500"
              >
                Lupa kata sandi?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
