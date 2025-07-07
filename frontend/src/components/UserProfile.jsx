import { useState } from 'react';

function UserProfile({ user, onSaveHandles, onLogout, message }) {
  const [leetcodeUsername, setLeetcodeUsername] = useState(user.leetcodeUsername || '');
  const [codeforcesHandle, setCodeforcesHandle] = useState(user.codeforcesHandle || '');
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onSaveHandles({ leetcodeUsername, codeforcesHandle });
    setEditing(false);
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg mb-6 text-center">
      <p className="text-white text-lg mb-2">
        Welcome, <span className="font-semibold">{user.email}</span>!
      </p>
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-4">
        <div className="w-full md:w-auto">
          <label className="text-gray-300 text-sm block mb-1">LeetCode Username</label>
          <input
            type="text"
            value={leetcodeUsername}
            onChange={(e) => setLeetcodeUsername(e.target.value)}
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white w-full"
            disabled={!editing}
          />
        </div>
        <div className="w-full md:w-auto">
          <label className="text-gray-300 text-sm block mb-1">Codeforces Handle</label>
          <input
            type="text"
            value={codeforcesHandle}
            onChange={(e) => setCodeforcesHandle(e.target.value)}
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white w-full"
            disabled={!editing}
          />
        </div>
        {editing ? (
          <button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold p-3 rounded-lg h-[46px] mt-4 md:mt-0 self-end"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-lg h-[46px] mt-4 md:mt-0 self-end"
          >
            Edit
          </button>
        )}
      </div>
      {message && <p className="text-sm text-red-400 mt-2 text-center">{message}</p>}
      <button
        onClick={onLogout}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg block mx-auto mt-2"
      >
        Logout
      </button>
    </div>
  );
}

export default UserProfile; 