import { useState, useEffect } from 'react';
import leetcodeLogo from './assets/leetcode.svg';
import AuthButtons from './components/AuthButtons';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import UserProfile from './components/UserProfile';
import Dashboard from './components/Dashboard';
import PracticeProblems from './components/PracticeProblems';
import ActivityHeatmap from './components/ActivityHeatmap';

const API_BASE_URL = 'http://localhost:3000/api/auth';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Persistent login: check localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Store token and user in localStorage when they change
  useEffect(() => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  // Handle login API call
  const handleLogin = async ({ email, password }) => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setUser({ email: data.email, leetcodeUsername: data.leetcodeUsername, codeforcesHandle: data.codeforcesHandle });
      setToken(data.token);
      setShowLogin(false);
      setShowSignup(false);
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Handle signup API call
  const handleSignup = async ({ email, password, leetcodeUsername, codeforcesHandle }) => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, leetcodeUsername, codeforcesHandle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      setUser({ email: data.email, leetcodeUsername: data.leetcodeUsername, codeforcesHandle: data.codeforcesHandle });
      setToken(data.token);
      setShowLogin(false);
      setShowSignup(false);
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Handle update handles API call
  const handleSaveHandles = async ({ leetcodeUsername, codeforcesHandle }) => {
    setMessage('');
    try {
      const res = await fetch('http://localhost:3000/api/user/handles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leetcodeUsername, codeforcesHandle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update handles');
      setUser((prev) => ({ ...prev, leetcodeUsername: data.leetcodeUsername, codeforcesHandle: data.codeforcesHandle }));
      setMessage('Handles updated successfully!');
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setMessage('');
    setShowLogin(false);
    setShowSignup(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-start p-6">
      <div className="container mx-auto bg-gray-800 rounded-lg shadow-xl p-6 mt-8">
        <header className="mb-6 flex flex-col items-center">
          <img src={leetcodeLogo} alt="LeetCode Logo" className="w-16 h-16 mb-2" />
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Coding Stats Dashboard
          </h1>
        </header>
        <main>
          {user && token ? (
            <>
              <UserProfile
                user={user}
                onSaveHandles={handleSaveHandles}
                onLogout={handleLogout}
                message={message}
              />
              <Dashboard token={token} />
              <ActivityHeatmap token={token} user={user} />
              <PracticeProblems token={token} />
            </>
          ) : (
            <>
              {!showLogin && !showSignup && (
                <AuthButtons
                  onShowLogin={() => { setShowLogin(true); setShowSignup(false); setMessage(''); }}
                  onShowSignup={() => { setShowSignup(true); setShowLogin(false); setMessage(''); }}
                />
              )}
              {showLogin && (
                <LoginForm
                  onLogin={handleLogin}
                  onClose={() => setShowLogin(false)}
                  message={message}
                />
              )}
              {showSignup && (
                <SignupForm
                  onSignup={handleSignup}
                  onClose={() => setShowSignup(false)}
                  message={message}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App; 