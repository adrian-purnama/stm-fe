import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Users, BarChart3, ChevronRight, TrendingUp, CheckCircle, ArrowRight, Shield, Zap, Edit3, Save, Star, RotateCcw, Database, Truck, FileImage } from 'lucide-react'
import Navigation from '../components/common/Navigation'
import BaseModal from '../components/modals/BaseModal'
import { UserContext } from '../utils/contexts/UserContext'

const HomePage = () => {
  const { user } = useContext(UserContext);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState({
    tools: [1],
    analytics: [1, 2],
    data: [1, 2],
    admin: [1, 2]
  });

  // All available cards
  const allToolCards = [
    {
      id: 1,
      title: 'Manajemen Quotation',
      subtitle: 'Alat',
      description: 'Buat, kelola, dan lacak Quotation',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/quotations'
    }
  ];

  const allAnalyticsCards = [
    {
      id: 1,
      title: 'Analisis Quotation',
      subtitle: 'Analisis',
      description: 'Analisis data Quotation',
      icon: TrendingUp,
      color: 'bg-green-500',
      href: '/quotations/analysis'
    },
    {
      id: 2,
      title: 'Analisis Dinamis',
      subtitle: 'Analisis',
      description: 'Analisis data CSV dan wawasan bisnis yang fleksibel',
      icon: TrendingUp,
      color: 'bg-purple-500',
      href: '/dynamic-analytics'
    }
  ];

  const allDataCards = [
    {
      id: 1,
      title: 'Product Catalogue',
      subtitle: 'Data',
      description: 'Kelola jenis-jenis truck dan kategorinya',
      icon: Truck,
      color: 'bg-orange-500',
      href: '/data/truck-types'
    },
    {
      id: 2,
      title: 'Manajemen Drawing Specification',
      subtitle: 'Data',
      description: 'Kelola spesifikasi gambar dan file drawing truck',
      icon: FileImage,
      color: 'bg-indigo-500',
      href: '/data/drawing-specifications'
    }
  ];

  const allAdminCards = [
    {
      id: 1,
      title: 'Manajemen User',
      subtitle: 'Admin',
      description: 'Kelola pengguna, role, dan izin akses',
      icon: Users,
      color: 'bg-red-500',
      href: '/users',
      adminOnly: true
    },
    {
      id: 2,
      title: 'Manajemen Permission',
      subtitle: 'Admin',
      description: 'Kelola permission dan kategori sistem',
      icon: Shield,
      color: 'bg-purple-600',
      href: '/permissions',
      adminOnly: true
    }
  ];

  // Load saved preferences on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('dashboardPreferences');
    if (savedPreferences) {
      setSelectedCards(JSON.parse(savedPreferences));
    }
  }, []);

  // Get filtered cards based on selection
  const toolCards = allToolCards.filter(card => (selectedCards.tools || []).includes(card.id));
  const analyticsCards = allAnalyticsCards.filter(card => (selectedCards.analytics || []).includes(card.id));
  const dataCards = allDataCards.filter(card => (selectedCards.data || []).includes(card.id));
  const adminCards = allAdminCards.filter(card => (selectedCards.admin || []).includes(card.id));

  const handleCardToggle = (category, cardId) => {
    setSelectedCards(prev => ({
      ...prev,
      [category]: (prev[category] || []).includes(cardId)
        ? (prev[category] || []).filter(id => id !== cardId)
        : [...(prev[category] || []), cardId]
    }));
  };

  const handleSavePreferences = () => {
    localStorage.setItem('dashboardPreferences', JSON.stringify(selectedCards));
    setIsCustomizeModalOpen(false);
  };

  const handleResetPreferences = () => {
    setSelectedCards({
      tools: [1],
      analytics: [1, 2],
      data: [1, 2],
      admin: [1, 2]
    });
  };

  return (
    <>
      <Navigation />
      {user.isLoggedIn ? (
        // Dashboard content for logged-in users
        <div className="min-h-screen bg-gray-50">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8 flex justify-between items-center flex-col md:flex-row gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang di Sistem ASB</h2>
                  <p className="text-gray-600">Pilih alat atau analisis untuk memulai pekerjaan Anda.</p>
                </div>
                <button
                  onClick={() => setIsCustomizeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Star size={16} className="text-yellow-500" />
                  <span>Favorite Cards</span>
                </button>
              </div>

              {/* Tools Section */}
              {toolCards.length > 0 && (
                <div className="mb-12">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Alat</h3>
                    <p className="text-gray-600">Mempermudah Pekerjaan Anda</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {toolCards.map((tool) => (
                    <Link
                      key={tool.id}
                      to={tool.href}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group block"
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className={`${tool.color} text-white p-3 rounded-lg`}>
                            <tool.icon size={24} />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">
                              {tool.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {tool.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {tool.description}
                        </p>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center text-sm text-red-600 font-medium">
                          <span>Buka alat</span>
                          <ChevronRight size={16} className="ml-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              )}

              {/* Analytics Section */}
              {analyticsCards.length > 0 && (
                <div className="mb-12">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Analisis</h3>
                    <p className="text-gray-600">Lihat wawasan dan metrik kinerja</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {analyticsCards.map((analytics) => (
                    <Link
                      key={analytics.id}
                      to={analytics.href}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group block"
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className={`${analytics.color} text-white p-3 rounded-lg`}>
                            <analytics.icon size={24} />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">
                              {analytics.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {analytics.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {analytics.description}
                        </p>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center text-sm text-red-600 font-medium">
                          <span>Lihat analisis</span>
                          <ChevronRight size={16} className="ml-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              )}

              {/* Data Section */}
              {dataCards.length > 0 && (
                <div className="mb-12">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Data</h3>
                    <p className="text-gray-600">Kelola data master dan referensi sistem</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dataCards.map((data) => (
                    <Link
                      key={data.id}
                      to={data.href}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group block"
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className={`${data.color} text-white p-3 rounded-lg`}>
                            <data.icon size={24} />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">
                              {data.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {data.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {data.description}
                        </p>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center text-sm text-red-600 font-medium">
                          <span>Kelola data</span>
                          <ChevronRight size={16} className="ml-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              )}

              {/* Admin Section - Visible to everyone, access controlled by roles */}
              {adminCards.length > 0 && (
                <div className="mb-12">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin</h3>
                    <p className="text-gray-600">Kelola pengguna, role, dan sistem</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminCards.map((admin) => (
                    <Link
                      key={admin.id}
                      to={admin.href}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group block"
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className={`${admin.color} text-white p-3 rounded-lg`}>
                            <admin.icon size={24} />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">
                              {admin.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {admin.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {admin.description}
                        </p>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center text-sm text-red-600 font-medium">
                          <span>Kelola admin</span>
                          <ChevronRight size={16} className="ml-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Customize Dashboard Modal */}
          <BaseModal
            isOpen={isCustomizeModalOpen}
            onClose={() => setIsCustomizeModalOpen(false)}
            title="⭐ Favorite Dashboard Cards"
            size="lg"
          >
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-6">
                Click the stars to favorite cards you want to see on your dashboard
              </div>
              
              {/* Tools Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Tools
                </h3>
                <div className="space-y-3">
                  {allToolCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                      onClick={() => handleCardToggle('tools', card.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`${card.color} text-white p-2 rounded-lg`}>
                          <card.icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{card.title}</h4>
                          <p className="text-sm text-gray-500">{card.description}</p>
                        </div>
                      </div>
                      <Star 
                        size={20} 
                        className={`transition-colors ${
                          (selectedCards.tools || []).includes(card.id) 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Analytics
                </h3>
                <div className="space-y-3">
                  {allAnalyticsCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                      onClick={() => handleCardToggle('analytics', card.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`${card.color} text-white p-2 rounded-lg`}>
                          <card.icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{card.title}</h4>
                          <p className="text-sm text-gray-500">{card.description}</p>
                        </div>
                      </div>
                      <Star 
                        size={20} 
                        className={`transition-colors ${
                          (selectedCards.analytics || []).includes(card.id) 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Database size={20} />
                  Data
                </h3>
                <div className="space-y-3">
                  {allDataCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all"
                      onClick={() => handleCardToggle('data', card.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`${card.color} text-white p-2 rounded-lg`}>
                          <card.icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{card.title}</h4>
                          <p className="text-sm text-gray-500">{card.description}</p>
                        </div>
                      </div>
                      <Star 
                        size={20} 
                        className={`transition-colors ${
                          (selectedCards.data || []).includes(card.id) 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Section - Visible to everyone */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield size={20} />
                  Admin
                </h3>
                <div className="space-y-3">
                  {allAdminCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 cursor-pointer transition-all"
                      onClick={() => handleCardToggle('admin', card.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`${card.color} text-white p-2 rounded-lg`}>
                          <card.icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{card.title}</h4>
                          <p className="text-sm text-gray-500">{card.description}</p>
                        </div>
                      </div>
                      <Star 
                        size={20} 
                        className={`transition-colors ${
                          (selectedCards.admin || []).includes(card.id) 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleResetPreferences}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reset to Default
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsCustomizeModalOpen(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePreferences}
                    className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Star size={16} />
                    Save Favorites
                  </button>
                </div>
              </div>
            </div>
          </BaseModal>
        </div>
      ) : (
        // Landing page content for non-logged-in users
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <div className="pt-16 pb-20 text-center">
              <div className="mb-8">
                <img src="/asb logo fun.png" alt="ASB Logo" className="w-100 mx-auto mb-8" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                Portal <span className="text-red-600">ASB</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Sistem manajemen quotation dan analisis bisnis yang powerful untuk meningkatkan efisiensi operasional Anda
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link
                  to="/login"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Shield size={20} />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white hover:bg-gray-50 text-red-600 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-red-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Zap size={20} />
                  Daftar Sekarang
                </Link>
              </div>
            </div>           
          </div>
        </div>
      )}
    </>
  )
}

export default HomePage