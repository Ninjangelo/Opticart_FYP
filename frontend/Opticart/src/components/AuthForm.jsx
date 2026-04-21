import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isLogin) {
      // login process
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else setMessage('Successfully logged in!');
    } else {
      // registration process
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else setMessage('Registration successful! You are now logged in.');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <h2 className="text-3xl font-bold text-white mb-2 font-montserrat">
        {isLogin ? 'Log In' : 'Create Account'}
      </h2>
      
      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-4 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-temporary-turqoise font-manrope"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-4 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-temporary-turqoise font-manrope"
        />
        <button 
          type="submit" 
          disabled={loading} 
          className="p-4 mt-2 rounded-xl bg-temporary-turqoise text-white font-bold font-montserrat hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : (isLogin ? 'Log in' : 'Sign up')}
        </button>
      </form>
      
      {message && (
        <p className={`mt-2 text-sm font-bold font-manrope ${message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid') ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
      
      <button 
        onClick={() => {
            setIsLogin(!isLogin);
            setMessage('');
            setEmail('');
            setPassword('');
        }} 
        className="mt-4 text-sm text-gray-400 hover:text-white underline bg-transparent border-none cursor-pointer font-manrope"
      >
        {isLogin ? 'Need an account? Sign up here' : 'Already have an account? Log in'}
      </button>
    </div>
  );
}