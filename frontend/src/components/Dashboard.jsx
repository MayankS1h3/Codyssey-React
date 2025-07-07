import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';

function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/user/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch stats');
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // First, refresh the cache
      const refreshRes = await fetch('http://localhost:3000/api/user/refresh-cache', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!refreshRes.ok) {
        throw new Error('Failed to refresh cache');
      }

      // Then fetch fresh stats
      await fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  if (loading) {
    return <div className="text-center text-gray-300">Loading your stats...</div>;
  }
  if (error) {
    return (
      <div className="text-center text-red-400">
        {error}
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
        >
          {refreshing ? 'Refreshing...' : 'Retry'}
        </button>
      </div>
    );
  }
  if (!stats) {
    return <div className="text-center text-gray-400">No stats available.</div>;
  }

  // Chart 1: Solved Chart (Bar, LeetCode & Codeforces by difficulty)
  const solvedChartOptions = {
    chart: { type: 'bar', height: 350, foreColor: '#e2e8f0', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Easy', 'Medium', 'Hard'], labels: { style: { colors: '#e2e8f0' } } },
    yaxis: { title: { text: 'Problems Solved', style: { color: '#e2e8f0' } }, labels: { style: { colors: '#e2e8f0' } } },
    fill: { opacity: 1 },
    legend: { position: 'top', labels: { colors: '#e2e8f0' } },
    colors: ['#4ade80', '#fbbf24'],
    tooltip: { theme: 'dark' },
  };
  const solvedChartSeries = [
    {
      name: 'LeetCode',
      data: [stats.leetcodeEasySolved || 0, stats.leetcodeMediumSolved || 0, stats.leetcodeHardSolved || 0],
    },
    {
      name: 'Codeforces',
      data: [0, 0, 0], // Placeholder, as Codeforces solved by difficulty is not available
    },
  ];

  // Chart 2: Total Chart (Pie, LeetCode total problems by difficulty)
  const totalChartOptions = {
    chart: { type: 'pie', height: 350, foreColor: '#e2e8f0' },
    labels: ['Easy', 'Medium', 'Hard'],
    colors: ['#60a5fa', '#818cf8', '#a78bfa'],
    dataLabels: { enabled: true, style: { colors: ['#1a202c'] }, dropShadow: { enabled: false } },
    legend: { position: 'top', labels: { colors: '#e2e8f0' } },
    tooltip: { theme: 'dark', y: { formatter: (val) => val + ' problems' } },
  };
  const totalChartSeries = [stats.totalEasy || 0, stats.totalMedium || 0, stats.totalHard || 0];

  // Chart 3: Progress Chart (Radar, LeetCode solved % by difficulty)
  const progressData = [
    stats.totalEasy ? ((stats.leetcodeEasySolved || 0) / stats.totalEasy) * 100 : 0,
    stats.totalMedium ? ((stats.leetcodeMediumSolved || 0) / stats.totalMedium) * 100 : 0,
    stats.totalHard ? ((stats.leetcodeHardSolved || 0) / stats.totalHard) * 100 : 0,
  ].map((p) => parseFloat(p.toFixed(1)));
  const progressChartOptions = {
    chart: { height: 350, type: 'radar', foreColor: '#e2e8f0', toolbar: { show: false } },
    xaxis: { categories: ['Easy', 'Medium', 'Hard'], labels: { style: { colors: ['#e2e8f0', '#e2e8f0', '#e2e8f0'] } } },
    yaxis: { min: 0, max: 100, labels: { formatter: (val) => val.toFixed(0) + '%', style: { colors: '#e2e8f0' } } },
    fill: { opacity: 0.5, colors: ['#8b5cf6'] },
    stroke: { show: true, width: 2, colors: ['#8b5cf6'], dashArray: 0 },
    markers: { size: 4, colors: ['#8b5cf6'], strokeColor: '#e2e8f0', strokeWidth: 2 },
    tooltip: { theme: 'dark', y: { formatter: (val) => val.toFixed(1) + '%' } },
    plotOptions: { radar: { polygons: { strokeColors: '#718096', connectorColors: '#718096' } } },
  };
  const progressChartSeries = [{ name: 'LeetCode Progress', data: progressData }];

  // Chart 4: Comparison Chart (Bar, LeetCode vs Codeforces by difficulty)
  const comparisonChartOptions = {
    chart: { type: 'bar', height: 350, foreColor: '#e2e8f0', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '60%', dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, formatter: (val) => (val > 0 ? val : ''), offsetY: -20, style: { fontSize: '10px', colors: ['#e2e8f0'] } },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: { categories: ['Easy', 'Medium', 'Hard'], labels: { style: { colors: '#e2e8f0' } } },
    yaxis: { title: { text: 'Problems Solved', style: { color: '#e2e8f0' } }, labels: { style: { colors: '#e2e8f0' } } },
    fill: { opacity: 1 },
    legend: { position: 'top', labels: { colors: '#e2e8f0' } },
    colors: ['#10b981', '#3b82f6'],
    tooltip: { theme: 'dark', y: { formatter: (val) => val + ' problems' } },
  };
  const comparisonChartSeries = [
    {
      name: 'LeetCode',
      data: [stats.leetcodeEasySolved || 0, stats.leetcodeMediumSolved || 0, stats.leetcodeHardSolved || 0],
    },
    {
      name: 'Codeforces',
      data: [0, 0, 0], // Placeholder, as Codeforces solved by difficulty is not available
    },
  ];

  // Bonus: Donut Chart for LeetCode Solved vs Unsolved
  const totalSolved = (stats.leetcodeEasySolved || 0) + (stats.leetcodeMediumSolved || 0) + (stats.leetcodeHardSolved || 0);
  const totalAvailable = (stats.totalEasy || 0) + (stats.totalMedium || 0) + (stats.totalHard || 0);
  const donutChartOptions = {
    chart: { type: 'donut', height: 320, foreColor: '#e2e8f0' },
    labels: ['Solved', 'Unsolved'],
    colors: ['#34d399', '#f87171'],
    dataLabels: { enabled: true },
    legend: { position: 'top', labels: { colors: '#e2e8f0' } },
    tooltip: { theme: 'dark', y: { formatter: (val) => val + ' problems' } },
  };
  const donutChartSeries = [totalSolved, Math.max(totalAvailable - totalSolved, 0)];

  return (
    <div className="bg-gray-700 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Your Stats Dashboard</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {refreshing ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-600 p-4 rounded-lg">
          <h3 className="text-sm text-gray-300">LeetCode Total</h3>
          <p className="text-2xl font-bold text-white">{stats.leetcodeTotalSolved || 0}</p>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <h3 className="text-sm text-gray-300">Codeforces Rating</h3>
          <p className="text-2xl font-bold text-white">{stats.codeforcesRating || 'N/A'}</p>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <h3 className="text-sm text-gray-300">Max Rating</h3>
          <p className="text-2xl font-bold text-white">{stats.codeforcesMaxRating || 'N/A'}</p>
        </div>
        <div className="bg-gray-600 p-4 rounded-lg">
          <h3 className="text-sm text-gray-300">Rank</h3>
          <p className="text-2xl font-bold text-white">{stats.codeforcesRank || 'N/A'}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Solved Chart */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-white">Problems Solved</h3>
          <Chart options={solvedChartOptions} series={solvedChartSeries} type="bar" height={350} />
        </div>
        {/* Total Chart */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-white">Total Problems (LeetCode)</h3>
          <Chart options={totalChartOptions} series={totalChartSeries} type="pie" height={350} />
        </div>
        {/* Progress Chart */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-white">Progress Radar (LeetCode)</h3>
          <Chart options={progressChartOptions} series={progressChartSeries} type="radar" height={350} />
        </div>
        {/* Comparison Chart */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-white">Comparison: Solved</h3>
          <Chart options={comparisonChartOptions} series={comparisonChartSeries} type="bar" height={350} />
        </div>
      </div>
      {/* Bonus: Donut Chart (full width below grid) */}
      <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center mt-8">
        <h3 className="text-lg font-semibold mb-4 text-white">LeetCode Solved vs Unsolved</h3>
        <Chart options={donutChartOptions} series={donutChartSeries} type="donut" height={320} />
      </div>
    </div>
  );
}

export default Dashboard; 