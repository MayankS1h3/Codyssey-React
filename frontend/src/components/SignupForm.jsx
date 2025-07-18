import { useState } from 'react';

function SignupForm({ onSignup, onClose, message }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [codeforcesHandle, setCodeforcesHandle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignup({ email, password, leetcodeUsername, codeforcesHandle });
  };

  return (
    <div className="auth-form bg-gray-700 p-6 rounded-lg mb-4">
      <h2 className="text-xl text-white mb-3 text-center">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 mb-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 mb-2"
        />
        <input
          type="text"
          placeholder="LeetCode Username (Optional)"
          value={leetcodeUsername}
          onChange={(e) => setLeetcodeUsername(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 mb-2"
        />
        <input
          type="text"
          placeholder="Codeforces Handle (Optional)"
          value={codeforcesHandle}
          onChange={(e) => setCodeforcesHandle(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 mb-2"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded-lg w-full mt-2"
        >
          Sign Up
        </button>
        {message && <p className="text-sm text-red-400 mt-2 text-center">{message}</p>}
      </form>
      <button onClick={onClose} className="block mx-auto mt-2 text-gray-400 hover:underline text-sm">Cancel</button>
    </div>
  );
}

export default SignupForm; 