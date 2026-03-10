/**
 * LoginScreen — full-page login form with Boronia branding.
 * Uses Supabase email/password auth. No sign-up — users are
 * created by the admin directly in the Supabase dashboard.
 */

import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import logo from '../../assets/boronia_consulting_logo.jpg';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    // On success the parent picks up the session via onAuthStateChange
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
      {/* Card */}
      <div className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden bg-white">
        {/* Branding header */}
        <div className="bg-[#1E2A3A] px-8 py-10 flex flex-col items-center gap-4">
          <img
            src={logo}
            alt="Boronia Consulting"
            className="h-14 w-auto object-contain rounded"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              CloseOut
            </h1>
            <p className="text-sm text-gray-400 mt-1">by Boronia Consulting</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8505B] focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8505B] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8505B] hover:bg-[#d4454f] disabled:opacity-60 text-white text-sm font-semibold rounded-md px-4 py-2.5 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Don&rsquo;t have an account? Contact your administrator.
      </p>
    </div>
  );
}
