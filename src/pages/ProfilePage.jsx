import { useState, useContext, useEffect } from 'react';
import { User, Mail, Lock, Save, X, Eye, EyeOff, ArrowLeft, Phone, UserCheck, Plus, Trash2 } from 'lucide-react';
import Navigation from '../components/common/Navigation';
import BaseModal from '../components/modals/BaseModal';
import { UserContext } from '../utils/contexts/UserContext';
import axiosInstance from '../utils/api/ApiHelper';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phoneNumbers: user?.phoneNumbers || []
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch profile data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('/api/auth/profile');
        if (response.data.success) {
          const userData = response.data.data.user;
          setProfileData({
            fullName: userData.fullName || '',
            phoneNumbers: userData.phoneNumbers || []
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to user context data
        setProfileData({
          fullName: user?.fullName || '',
          phoneNumbers: user?.phoneNumbers || []
        });
      }
    };

    fetchProfile();
  }, [user]);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/auth/reset-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        toast.success('Kata sandi berhasil diperbarui!');
        setIsPasswordModalOpen(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui kata sandi');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    setProfileLoading(true);
    try {
      const response = await axiosInstance.put('/api/auth/profile', {
        fullName: profileData.fullName,
        phoneNumbers: profileData.phoneNumbers
      });

      if (response.data.success) {
        toast.success('Profil berhasil diperbarui!');
        // Update the profile data with the response
        const updatedUser = response.data.data.user;
        setProfileData({
          fullName: updatedUser.fullName || '',
          phoneNumbers: updatedUser.phoneNumbers || []
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setProfileLoading(false);
    }
  };

  const addPhoneNumber = () => {
    setProfileData({
      ...profileData,
      phoneNumbers: [...profileData.phoneNumbers, { label: '', value: '' }]
    });
  };

  const removePhoneNumber = (index) => {
    setProfileData({
      ...profileData,
      phoneNumbers: profileData.phoneNumbers.filter((_, i) => i !== index)
    });
  };

  const updatePhoneNumber = (index, field, value) => {
    const updatedPhoneNumbers = [...profileData.phoneNumbers];
    updatedPhoneNumbers[index][field] = value;
    setProfileData({
      ...profileData,
      phoneNumbers: updatedPhoneNumbers
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Pengaturan Profil" subtitle="Kelola pengaturan akun dan preferensi Anda" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>

        {/* Personal Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Informasi Pribadi</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCheck size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nomor Telepon
                  </label>
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={14} />
                    Tambah Nomor
                  </button>
                </div>
                
                <div className="space-y-3">
                  {profileData.phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={phone.label}
                          onChange={(e) => updatePhoneNumber(index, 'label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Contoh: Work, HP, Home"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          Nomor
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone size={14} className="text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={phone.value}
                            onChange={(e) => updatePhoneNumber(index, 'value', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="08123456789"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoneNumber(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus nomor telepon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  {profileData.phoneNumbers.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Belum ada nomor telepon. Klik "Tambah Nomor" untuk menambahkan.
                    </div>
                  )}
                </div>
              </div>

              {/* Email - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={user.email || ''}
                    readOnly
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
              </div>

              {/* Password - Reset Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value="••••••••"
                    readOnly
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-red-600 hover:text-red-700"
                  >
                    Reset Kata Sandi
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Password Reset Modal */}
      <BaseModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Reset Kata Sandi"
      >
        <form onSubmit={handlePasswordReset} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Sandi Saat Ini
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                placeholder="Masukkan kata sandi saat ini"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Masukkan kata sandi baru"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Konfirmasi kata sandi baru"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {loading ? 'Memuat...' : 'Perbarui Kata Sandi'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default ProfilePage;
