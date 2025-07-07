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
      const { leetcodeUsername, codeforcesHandle } = user;
      let leetcodeCalendar = {};
      let codeforcesSubmissions = [];

      // Fetch LeetCode submission calendar
      if (leetcodeUsername) {
        try {
          const response = await fetch(`https://leetcode-stats-api.herokuapp.com/${leetcodeUsername}`);
          if (response.ok) {
            const data = await response.json();
            if (data.submissionCalendar) {
              leetcodeCalendar = data.submissionCalendar;
            }
          }
        } catch (err) {
          // Ignore, continue with Codeforces
        }
      }

      // Fetch Codeforces submissions
      if (codeforcesHandle) {
        try {
          const response = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(codeforcesHandle)}&from=1&count=1000`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'OK' && data.result) {
              codeforcesSubmissions = data.result;
            }
          }
        } catch (err) {
          // Ignore, continue with LeetCode
        }
      }

      // Combine activity data
      const activityMap = {};
      // LeetCode
      if (leetcodeCalendar && typeof leetcodeCalendar === 'object') {
        for (const timestampStr in leetcodeCalendar) {
          const dateStr = toDateString(Number(timestampStr));
          activityMap[dateStr] = (activityMap[dateStr] || 0) + leetcodeCalendar[timestampStr];
        }
      }
      // Codeforces
      if (Array.isArray(codeforcesSubmissions)) {
        codeforcesSubmissions.forEach((submission) => {
          const dateStr = toDateString(submission.creationTimeSeconds);
          activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
        });
      }
      // Convert to array for react-calendar-heatmap
      const dataArr = Object.entries(activityMap).map(([date, count]) => ({ date, count }));
      setHeatmapData(dataArr);
      setHasLoaded(true);
    } catch (err) {
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Toggle heatmap
  const handleToggleHeatmap = useCallback(() => {
    if (!isVisible && !hasLoaded) {
      fetchActivityData();
    }
    setIsVisible(!isVisible);
  }, [isVisible, hasLoaded, fetchActivityData]);

  const handleRefreshHeatmap = useCallback(() => {
    fetchActivityData();
  }, [fetchActivityData]);

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