import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ApiEndpoints } from '@/services/api/endpoints';
import { useUIStore } from '@/stores/uiStore';
import { Spinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';


interface SurveyRecord {
  request_id: string;
  project_name: string;
  company_name: string;
  industry: string;
  status: string;
  created_at: string;
  doc_link?: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsLoading, addNotification } = useUIStore();
  const [surveys, setSurveys] = React.useState<SurveyRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [surveyToDelete, setSurveyToDelete] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState('newest');

  const fetchSurveys = React.useCallback(async () => {
    try {
      const response = await ApiEndpoints.getUserSurveys();
      if (response.success) {
        setSurveys(response.surveys);
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load your surveys.',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  React.useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const sortedSurveys = React.useMemo(() => {
    return [...surveys].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return (a.project_name || '').localeCompare(b.project_name || '');
        case 'name-desc':
          return (b.project_name || '').localeCompare(a.project_name || '');
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [surveys, sortBy]);

  const handleDeleteClick = (requestId: string) => {
    setSurveyToDelete(requestId);
  };

  const confirmDelete = async () => {
    if (!surveyToDelete) return;
    
    const requestId = surveyToDelete;
    setDeletingId(requestId);
    setSurveyToDelete(null);
    try {
      const response = await ApiEndpoints.deleteSurvey(requestId);
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Survey deleted successfully.',
          duration: 2000,
        });
        setSurveys(prev => prev.filter(s => s.request_id !== requestId));
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete survey.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return 'bg-success-100 text-success-800 border-success-200';
      case 'RUNNING':
      case 'STARTING': return 'bg-primary-100 text-primary-800 border-primary-200 animate-pulse';
      case 'FAILED': return 'bg-error-100 text-error-800 border-error-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Surveys</h1>
          <p className="mt-2 text-gray-600">Manage and view your historical survey projects.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <div className="w-full sm:w-48">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'name-asc', label: 'Name (A-Z)' },
                { value: 'name-desc', label: 'Name (Z-A)' },
                { value: 'status', label: 'Status' },
              ]}
              className="rounded-full shadow-sm"
            />
          </div>
          <Link to="/create" className="w-full sm:w-auto">
            <Button size="lg" className="w-full rounded-full shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5">
              <span className="mr-2">+</span> Create New Survey
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl">
          <div className="text-6xl mb-6">📝</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No surveys found</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">You haven't created any surveys yet. Start your first project now!</p>
          <Link to="/create">
            <Button variant="outline">Create My First Survey</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSurveys.map((survey) => (
            <div key={survey.request_id} className="glass rounded-2xl p-6 transition-all hover:shadow-2xl hover:bg-white border hover:border-primary-200 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(survey.status)}`}>
                  {survey.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(survey.created_at).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{survey.project_name || 'Untitled Project'}</h3>
              <p className="text-sm text-gray-500 mb-1">{survey.company_name} • {survey.industry}</p>
              
              <div className="mt-auto pt-6 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {survey.status === 'COMPLETED' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/builder?requestId=${survey.request_id}`)}
                      className="rounded-lg"
                    >
                      Edit
                    </Button>
                  )}
                  {survey.doc_link && (
                    <a 
                      href={survey.doc_link} 
                      download
                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100"
                    >
                      DOCX
                    </a>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteClick(survey.request_id)}
                  disabled={deletingId === survey.request_id}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50 rounded-lg p-2"
                  title="Delete Survey"
                >
                  {deletingId === survey.request_id ? <Spinner size="sm" /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Modern Delete Confirmation Modal */}
      <Modal 
        isOpen={!!surveyToDelete} 
        onClose={() => setSurveyToDelete(null)}
        title="Delete Survey"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this survey? This action cannot be undone and will permanently remove the survey and its associated data.
          </p>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setSurveyToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirmDelete}
            className="bg-error-600 hover:bg-error-700 text-white shadow-sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
