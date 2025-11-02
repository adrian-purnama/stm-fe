import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/api/ApiHelper';
import { formatPriceWithCurrency } from '../../utils/helpers/priceFormatter';

const OfferItemAcceptance = ({ 
  offerItems, 
  onUpdate, 
  quotationNumber,
  offerId,
  isReadOnly = false 
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (offerItems) {
      setItems(offerItems.map(item => ({
        ...item,
        isAccepted: item.isAccepted || false
      })));
    }
  }, [offerItems]);

  const handleItemAcceptance = (itemId, isAccepted) => {
    setItems(prev => prev.map(item => 
      item._id === itemId ? { ...item, isAccepted } : item
    ));
    setHasChanges(true);
  };

  const handleBulkAccept = (acceptAll = true) => {
    setItems(prev => prev.map(item => ({ ...item, isAccepted: acceptAll })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    
    setLoading(true);
    try {
      const changedItems = items.filter(item => 
        item.isAccepted !== (offerItems.find(original => original._id === item._id)?.isAccepted || false)
      );

      if (changedItems.length === 0) {
        toast.error('No changes to save');
        setLoading(false);
        return;
      }

      const itemIds = changedItems.map(item => item._id);
      const isAccepted = changedItems[0].isAccepted; // All changed items have the same acceptance status

      // Update each item individually using the new API structure
      const promises = itemIds.map(itemId => 
        ApiHelper.patch(`/api/quotations/${encodeURIComponent(quotationNumber)}/offers/${offerId}/items/${itemId}/accept`)
      );
      await Promise.all(promises);

      toast.success(`${changedItems.length} item(s) ${isAccepted ? 'accepted' : 'unaccepted'} successfully`);
      setHasChanges(false);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error updating item acceptance:', error);
      toast.error(error.response?.data?.message || 'Failed to update item acceptance');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setItems(offerItems.map(item => ({
      ...item,
      isAccepted: item.isAccepted || false
    })));
    setHasChanges(false);
  };

  const acceptedCount = items.filter(item => item.isAccepted).length;
  const totalCount = items.length;
  const totalAcceptedValue = items
    .filter(item => item.isAccepted)
    .reduce((sum, item) => sum + item.netto, 0);
  const totalValue = items.reduce((sum, item) => sum + item.netto, 0);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No items to manage acceptance for.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Item Acceptance Management</h3>
        {!isReadOnly && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkAccept(true)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Accept All
            </button>
            <button
              onClick={() => handleBulkAccept(false)}
              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
            <div className="text-sm text-gray-600">Accepted Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {formatPriceWithCurrency(totalAcceptedValue)}
            </div>
            <div className="text-sm text-gray-600">Accepted Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {formatPriceWithCurrency(totalValue)}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={item._id || index} 
            className={`border rounded-lg p-4 transition-colors ${
              item.isAccepted 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      Item {item.itemNumber || (index + 1)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.isAccepted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.isAccepted ? 'Accepted' : 'Not Accepted'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {item.karoseri} - {item.chassis}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {formatPriceWithCurrency(item.netto)}
                </div>
              </div>
              
              {!isReadOnly && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleItemAcceptance(item._id, true)}
                    className={`p-2 rounded-md transition-colors ${
                      item.isAccepted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-green-100 hover:text-green-600'
                    }`}
                    title="Accept this item"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleItemAcceptance(item._id, false)}
                    className={`p-2 rounded-md transition-colors ${
                      !item.isAccepted 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'
                    }`}
                    title="Reject this item"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {!isReadOnly && hasChanges && (
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            This quotation has been won. Item acceptance is now locked and cannot be modified.
          </p>
        </div>
      )}
    </div>
  );
};

export default OfferItemAcceptance;
