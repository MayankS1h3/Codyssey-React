function AuthButtons({ onShowLogin, onShowSignup }) {
  return (
    <div className="text-center mb-4">
      <button
        onClick={onShowLogin}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg mr-2"
      >
        Login
      </button>
      <button
        onClick={onShowSignup}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
      >
        Sign Up
      </button>
    </div>
  );
}

export default AuthButtons; 