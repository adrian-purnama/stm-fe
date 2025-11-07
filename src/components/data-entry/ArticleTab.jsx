import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Plus, Search, Edit, Trash2, Eye, Loader2, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ApiHelper from '../../utils/api/ApiHelper';
import BaseModal from '../modals/BaseModal';
import CustomDropdown from '../common/CustomDropdown';
import RichTextEditor from '../common/RichTextEditor';

const initialFormState = {
  section: '',
  content: '',
  bodyType: '',
  qna: []
};

const ArticleTab = () => {
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodyTypeFilter, setBodyTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [bodyTypeOptions, setBodyTypeOptions] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    const loadBodyTypes = async () => {
      try {
        const response = await ApiHelper.get('/api/body-types/list');
        const options = (response.data.data || []).map((bodyType) => ({
          value: bodyType._id,
          label: bodyType.name
        }));
        setBodyTypeOptions(options);
      } catch (error) {
        console.error('Error loading body types list:', error);
        toast.error(error.response?.data?.message || 'Failed to load body types');
      }
    };

    loadBodyTypes();
  }, []);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        setArticlesLoading(true);
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };

        if (searchTerm) {
          params.search = searchTerm;
        }

        if (bodyTypeFilter) {
          params.bodyType = bodyTypeFilter;
        }

        const response = await ApiHelper.get('/api/articles', { params });
        const fetchedArticles = response.data.data || [];
        const paginationInfo = response.data.pagination || { page: 1, limit: 10, total: fetchedArticles.length, pages: 1 };

        setArticles(fetchedArticles);
        setPagination((prev) => ({
          ...prev,
          page: paginationInfo.page || prev.page,
          limit: paginationInfo.limit || prev.limit,
          total: paginationInfo.total || fetchedArticles.length,
          pages: paginationInfo.pages || Math.ceil((paginationInfo.total || fetchedArticles.length) / (paginationInfo.limit || prev.limit))
        }));
      } catch (error) {
        console.error('Error loading articles:', error);
        toast.error(error.response?.data?.message || 'Failed to load articles');
      } finally {
        setArticlesLoading(false);
      }
    };

    loadArticles();
  }, [pagination.page, pagination.limit, searchTerm, bodyTypeFilter, reloadCounter]);

  const bodyTypeDropdownOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...bodyTypeOptions
  ], [bodyTypeOptions]);

  const bodyTypeFilterOptions = useMemo(() => [
    { value: '', label: 'All Body Types' },
    ...bodyTypeOptions
  ], [bodyTypeOptions]);

  const handleOpenCreateModal = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (article) => {
    setSelectedArticle(article);
    setFormData({
      section: article.section || '',
      content: article.content || '',
      bodyType: article.bodyType?._id || '',
      qna: Array.isArray(article.qna) ? article.qna.map(item => ({ question: item.question || '', answer: item.answer || '' })) : []
    });
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (article) => {
    setSelectedArticle(article);
    setIsViewModalOpen(true);
  };

  const resetModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedArticle(null);
    setFormData(initialFormState);
  };

  const sanitizeQna = (qnaList) =>
    (qnaList || [])
      .filter(item => item && item.question?.trim() && item.answer?.trim())
      .map(item => ({
        question: item.question.trim(),
        answer: item.answer.trim()
      }));

  const createArticle = async () => {
    if (!formData.section.trim()) {
      toast.error('Article section is required');
      return;
    }

    const payload = {
      section: formData.section.trim(),
      content: formData.content || '',
      bodyType: formData.bodyType || null,
      qna: sanitizeQna(formData.qna)
    };

    try {
      await ApiHelper.post('/api/articles', payload);
      toast.success('Article created successfully');
      resetModals();
      setPagination((prev) => ({ ...prev, page: 1 }));
      setReloadCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Error creating article:', error);
      toast.error(error.response?.data?.message || 'Failed to create article');
    }
  };

  const updateArticle = async () => {
    if (!selectedArticle?._id) return;

    if (!formData.section.trim()) {
      toast.error('Article section is required');
      return;
    }

    const payload = {
      section: formData.section.trim(),
      content: formData.content || '',
      bodyType: formData.bodyType || null,
      qna: sanitizeQna(formData.qna)
    };

    try {
      await ApiHelper.put(`/api/articles/${selectedArticle._id}`, payload);
      toast.success('Article updated successfully');
      resetModals();
      setReloadCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error(error.response?.data?.message || 'Failed to update article');
    }
  };

  const deleteArticle = async (article) => {
    if (!article?._id) return;

    if (!window.confirm(`Are you sure you want to delete the article "${article.section}"?`)) {
      return;
    }

    try {
      await ApiHelper.delete(`/api/articles/${article._id}`);
      toast.success('Article deleted successfully');
      if (articles.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        setPagination((prev) => ({ ...prev }));
      }
      setReloadCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error(error.response?.data?.message || 'Failed to delete article');
    }
  };

  const addQnaItem = () => {
    setFormData((prev) => ({
      ...prev,
      qna: [...(prev.qna || []), { question: '', answer: '' }]
    }));
  };

  const updateQnaItem = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.qna || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, qna: updated };
    });
  };

  const removeQnaItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      qna: (prev.qna || []).filter((_, idx) => idx !== index)
    }));
  };

  const handlePaginationChange = (direction) => {
    setPagination((prev) => {
      const nextPage = direction === 'next' ? prev.page + 1 : prev.page - 1;
      if (nextPage < 1 || (prev.pages && nextPage > prev.pages)) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Articles
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage knowledge base articles, assign them to body types, and keep Q&amp;A up to date.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearchTerm(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <CustomDropdown
            options={bodyTypeFilterOptions}
            value={bodyTypeFilter}
            onChange={(value) => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              setBodyTypeFilter(value);
            }}
            placeholder="Filter by body type"
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {articlesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No articles found</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Article
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {articles.map((article) => (
              <div key={article._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{article.section}</h3>
                      {article.bodyType && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                          {article.bodyType.name}
                        </span>
                      )}
                    </div>
                    {article.createdBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Created by {article.createdBy.fullName || article.createdBy.email} ·{' '}
                        {new Date(article.createdAt).toLocaleString()}
                      </p>
                    )}
                    {article.qna && article.qna.length > 0 && (
                      <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                          <HelpCircle className="h-4 w-4" />
                          Q&amp;A ({article.qna.length})
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          {article.qna.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex flex-col">
                              <span className="font-medium">Q: {item.question}</span>
                              <span className="text-gray-600">A: {item.answer}</span>
                            </div>
                          ))}
                          {article.qna.length > 2 && (
                            <p className="text-xs text-gray-500">+{article.qna.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenViewModal(article)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(article)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteArticle(article)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {articles.length > 0 && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePaginationChange('prev')}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => handlePaginationChange('next')}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Article Modal */}
      <BaseModal
        isOpen={isCreateModalOpen}
        onClose={resetModals}
        title="Create Article"
        size="xl"
      >
        <ArticleForm
          formData={formData}
          setFormData={setFormData}
          bodyTypeOptions={bodyTypeDropdownOptions}
          onSubmit={createArticle}
          onCancel={resetModals}
          actionLabel="Create"
          onAddQna={addQnaItem}
          onUpdateQna={updateQnaItem}
          onRemoveQna={removeQnaItem}
        />
      </BaseModal>

      {/* Edit Article Modal */}
      <BaseModal
        isOpen={isEditModalOpen}
        onClose={resetModals}
        title="Edit Article"
        size="xl"
      >
        <ArticleForm
          formData={formData}
          setFormData={setFormData}
          bodyTypeOptions={bodyTypeDropdownOptions}
          onSubmit={updateArticle}
          onCancel={resetModals}
          actionLabel="Update"
          onAddQna={addQnaItem}
          onUpdateQna={updateQnaItem}
          onRemoveQna={removeQnaItem}
        />
      </BaseModal>

      {/* View Article Modal */}
      <BaseModal
        isOpen={isViewModalOpen}
        onClose={resetModals}
        title="Article Details"
        size="xl"
      >
        {selectedArticle && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Section</label>
              <p className="text-gray-900 text-lg font-semibold">{selectedArticle.section}</p>
            </div>

            {selectedArticle.bodyType && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Body Type</label>
                <p className="text-gray-900">{selectedArticle.bodyType.name}</p>
              </div>
            )}

            {selectedArticle.content && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Content</label>
                <div
                  className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>
            )}

            {selectedArticle.qna && selectedArticle.qna.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Q&amp;A</label>
                <div className="space-y-3">
                  {selectedArticle.qna.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="font-semibold text-gray-800">Q: {item.question}</p>
                      <p className="text-gray-700 mt-1">A: {item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={resetModals}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
};

const ArticleForm = ({
  formData,
  setFormData,
  bodyTypeOptions,
  onSubmit,
  onCancel,
  actionLabel,
  onAddQna,
  onUpdateQna,
  onRemoveQna
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Section *
      </label>
      <input
        type="text"
        value={formData.section}
        onChange={(e) => setFormData((prev) => ({ ...prev, section: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="e.g., Overview"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Assign Body Type
      </label>
      <CustomDropdown
        options={bodyTypeOptions}
        value={formData.bodyType}
        onChange={(value) => setFormData((prev) => ({ ...prev, bodyType: value }))}
        placeholder="Choose body type (optional)"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Content
      </label>
      <RichTextEditor
        value={formData.content}
        onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
        placeholder="Write article content with formatting..."
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Q&amp;A
        </label>
        <button
          type="button"
          onClick={onAddQna}
          className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-4 w-4 inline mr-1" />
          Add Q&A
        </button>
      </div>

      {(formData.qna || []).length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
          No Q&A entries yet. Add relevant questions and answers.
        </p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {formData.qna.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Question</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => onUpdateQna(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter question"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Answer</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => onUpdateQna(index, 'answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows="3"
                      placeholder="Provide answer"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveQna(index)}
                  className="text-red-600 hover:text-red-800 mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  </div>
);

export default ArticleTab;

