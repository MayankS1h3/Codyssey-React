import { useEffect, useState, useCallback } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import './ActivityHeatmap.css'; // We'll create this for custom styles

function ActivityHeatmap({ token, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);

  // Helper to get date string in YYYY-MM-DD
  const toDateString = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().slice(0, 10);
  };

  // Fetch and process activity data
  const fetchActivityData = useCallback(async () => {
    if (!user?.leetcodeUsername && !user?.codeforcesHandle) {
      setError('Please set your LeetCode username or Codeforces handle first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Use the new cached endpoint
      const response = await fetch('http://localhost:3000/api/user/activity-data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity data');
      }

      const data = await response.json();
      
      // Convert the activity data to the format expected by react-calendar-heatmap
      const dataArr = data.activityData.map(item => ({
        date: new Date(item.timestamp * 1000).toISOString().slice(0, 10),
        count: item.count
      }));

      setHeatmapData(dataArr);
      setHasLoaded(true);
    } catch (err) {
      setError('Failed to load activity data');
      console.error('Error fetching activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // Toggle heatmap
  const handleToggleHeatmap = useCallback(() => {
    if (!isVisible && !hasLoaded) {
      fetchActivityData();
    }
    setIsVisible(!isVisible);
  }, [isVisible, hasLoaded, fetchActivityData]);

  const handleRefreshHeatmap = useCallback(async () => {
    try {
      // First refresh the cache
      const refreshRes = await fetch('http://localhost:3000/api/user/refresh-cache', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!refreshRes.ok) {
        throw new Error('Failed to refresh cache');
      }

      // Then fetch fresh activity data
      fetchActivityData();
    } catch (err) {
      setError('Failed to refresh activity data');
      console.error('Error refreshing activity data:', err);
    }
  }, [fetchActivityData, token]);

  // Calculate start and end dates (last 1 month)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - 1);
  startDate.setDate(endDate.getDate()); // Show last 1 month from today

  return (
    <div className="bg-gray-700 p-6 rounded-lg mt-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Activity Heatmap</h2>
        <div className="flex gap-2">
          {isVisible && hasLoaded && (
            <button
              onClick={handleRefreshHeatmap}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          <button
            onClick={handleToggleHeatmap}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isVisible 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Loading...' : isVisible ? 'Hide Heatmap' : 'Show Activity Heatmap'}
          </button>
        </div>
      </div>
      {isVisible && (
        <>
          {loading ? (
            <div className="text-center text-gray-300">Loading activity data...</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-center text-gray-300 mb-4 text-sm">
                Combined activity from LeetCode and Codeforces (Last 1 month)
              </div>
              <div className="heatmap-outer-wrapper">
                <CalendarHeatmap
                  startDate={startDate}
                  endDate={endDate}
                  values={heatmapData}
                  classForValue={value => {
                    if (!value || value.count === 0) return 'heatmap-empty';
                    if (value.count < 2) return 'heatmap-green-1';
                    if (value.count < 5) return 'heatmap-green-2';
                    if (value.count < 10) return 'heatmap-green-3';
                    return 'heatmap-green-4';
                  }}
                  showWeekdayLabels={false}
                  gutterSize={2}
                  horizontal={true}
                  tooltipDataAttrs={value => {
                    if (!value || !value.date) return null;
                    return {
                      'data-tip': `${value.date}: ${value.count || 0} solved`
                    };
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActivityHeatmap; 