import React, { useMemo } from 'react';
import Navigation from '../components/common/Navigation';
import LazyTabs from '../components/common/LazyTabs';
import { Truck, Settings, Ruler, Sparkles, FileText, Building2, Key } from 'lucide-react';

const DataEntryPage = () => {

  // Define tabs with lazy loading
  const tabs = useMemo(() => [
    {
      key: 'body',
      label: 'Body Type',
      icon: Truck,
      component: () => import('../components/data-entry/BodyTypeTab')
    },
    {
      key: 'catalogue',
      label: 'Catalogues',
      icon: FileText,
      component: () => import('../components/data-entry/CatalogueTab')
    },
    {
      key: 'chassis',
      label: 'Chassis Type',
      icon: Settings,
      component: () => import('../components/data-entry/ChassisTypeTab')
    },
    {
      key: 'size',
      label: 'Size Type',
      icon: Ruler,
      component: () => import('../components/data-entry/SizeTypeTab')
    },
    {
      key: 'feature',
      label: 'Feature Type',
      icon: Sparkles,
      component: () => import('../components/data-entry/FeatureTypeTab')
    },
    {
      key: 'company',
      label: 'Companies',
      icon: Building2,
      component: () => import('../components/data-entry/CompanyTab')
    },
    {
      key: 'session',
      label: 'Catalogue Sessions',
      icon: Key,
      component: () => import('../components/data-entry/SessionTab')
    }
  ], []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Data Entry" subtitle="Manage truck and chassis data" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Entry</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <LazyTabs
              tabs={tabs}
              defaultActiveTab="body"
              storageKey="data-entry-active-tab"
              loadInitialTab={true}
              variant="default"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataEntryPage;
