import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import BaseModal from './BaseModal';
import axiosInstance from '../../utils/api/ApiHelper';
import toast from 'react-hot-toast';

const ProgressManagementModal = ({ isOpen, onClose, quotation, onUpdate }) => {
  const [progressList, setProgressList] = useState([]);
  const [newProgress, setNewProgress] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quotation && isOpen) {
      setProgressList(quotation.progress || []);
    }
  }, [quotation, isOpen]);

  const handleAddProgress = () => {
    if (!newProgress.trim()) {
      toast.error('Please enter a progress update');
      return;
    }

    const updatedProgress = [...progressList, newProgress.trim()];
    setProgressList(updatedProgress);
    setNewProgress('');
  };

  const handleEditProgress = (index) => {
    setEditingIndex(index);
    setEditingText(progressList[index]);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim()) {
      toast.error('Please enter a progress update');
      return;
    }

    const updatedProgress = [...progressList];
    updatedProgress[editingIndex] = editingText.trim();
    setProgressList(updatedProgress);
    setEditingIndex(-1);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(-1);
    setEditingText('');
  };

  const handleDeleteProgress = (index) => {
    const updatedProgress = progressList.filter((_, i) => i !== index);
    setProgressList(updatedProgress);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.put(`/api/quotations/${quotation._id}/progress`, {
        progress: progressList
      });

      if (response.data.success) {
        toast.success('Progress updated successfully!');
        onUpdate(response.data.data.quotation);
        onClose();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error(error.response?.data?.message || 'Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProgressList(quotation?.progress || []);
    setNewProgress('');
    setEditingIndex(-1);
    setEditingText('');
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Manage Progress">
      <div className="space-y-4">
        {/* Add new progress */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newProgress}
            onChange={(e) => setNewProgress(e.target.value)}
            placeholder="Enter new progress update..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddProgress()}
          />
          <button
            onClick={handleAddProgress}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {/* Progress list */}
        <div className="max-h-96 overflow-y-auto">
          {progressList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No progress updates yet. Add your first update above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {progressList.map((progress, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
                  {editingIndex === index ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{progress}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditProgress(index)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit progress"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProgress(index)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete progress"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ProgressManagementModal;

