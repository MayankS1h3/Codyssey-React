import { useState } from 'react';

function PracticeProblems({ token }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchPracticeProblems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/user/practice-problems', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch practice problems');
      setProblems(data.problems || []);
      setMessage(data.message || '');
      setHasLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePracticeProblems = () => {
    if (!isVisible && !hasLoaded) {
      fetchPracticeProblems();
    }
    setIsVisible(!isVisible);
  };

  const handleRefreshProblems = () => {
    fetchPracticeProblems();
  };

  const getDifficultyColor = (difficulty, rating) => {
    if (difficulty) {
      switch (difficulty.toLowerCase()) {
        case 'easy': return 'text-green-400';
        case 'medium': return 'text-yellow-400';
        case 'hard': return 'text-red-400';
        default: return 'text-gray-400';
      }
    }
    if (rating) {
      if (rating < 1200) return 'text-green-400';
      if (rating < 1600) return 'text-yellow-400';
      if (rating < 2000) return 'text-orange-400';
      return 'text-red-400';
    }
    return 'text-gray-400';
  };

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'leetcode':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.102 17v-3.5h2.5v3.5h-2.5zM16.102 10.5v-3.5h2.5v3.5h-2.5zM13.602 17v-3.5h2.5v3.5h-2.5zM13.602 10.5v-3.5h2.5v3.5h-2.5zM11.102 17v-3.5h2.5v3.5h-2.5zM11.102 10.5v-3.5h2.5v3.5h-2.5zM8.602 17v-3.5h2.5v3.5h-2.5zM8.602 10.5v-3.5h2.5v3.5h-2.5zM6.102 17v-3.5h2.5v3.5h-2.5zM6.102 10.5v-3.5h2.5v3.5h-2.5z"/>
          </svg>
        );
      case 'codeforces':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      default:
        return <span className="w-4 h-4">📝</span>;
    }
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg mt-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Practice Problems</h2>
        <div className="flex gap-2">
          {isVisible && hasLoaded && (
            <button
              onClick={handleRefreshProblems}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          <button
            onClick={handleTogglePracticeProblems}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isVisible 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isVisible ? 'Hide Problems' : 'Show Practice Problems'}
          </button>
        </div>
      </div>
      
      {isVisible && (
        <>
          {loading ? (
            <div className="text-center text-gray-300">Loading practice problems...</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : (
            <>
              {message && (
                <div className="text-center text-gray-300 mb-4 text-sm">{message}</div>
              )}

              {problems.length === 0 ? (
                <div className="text-center text-gray-400">
                  No practice problems available. Try solving more problems to get recommendations!
                </div>
              ) : (
                <div className="grid gap-4">
                  {problems.map((problem, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPlatformIcon(problem.platform)}
                            <span className="text-sm text-gray-400">{problem.platform}</span>
                            {problem.difficulty && (
                              <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                {problem.difficulty}
                              </span>
                            )}
                            {problem.rating && (
                              <span className={`text-sm font-medium ${getDifficultyColor(null, problem.rating)}`}>
                                {problem.rating}
                              </span>
                            )}
                          </div>
                          <h3 className="text-white font-semibold mb-2">{problem.name}</h3>
                          {problem.tags && problem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {problem.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {problem.tags.length > 3 && (
                                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                                  +{problem.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-4"
                        >
                          Solve
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default PracticeProblems; 