'use client';

import React, { useState } from 'react';
import { Lock, Mail, Phone, User, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onLogin: (user: { name: string; email: string; phone: string }) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState(() => {
    if (typeof window === 'undefined') return [];

    try {
      const saved = window.localStorage.getItem('rag-users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (isSignUp) {
      if (!form.name.trim() || !form.phone.trim()) {
        setError('Please enter your name and phone number.');
        return;
      }

      const existingUser = users.find((u: any) => u.email.toLowerCase() === email);
      if (existingUser) {
        setError('An account with this email already exists.');
        return;
      }

      const newUser = {
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        password,
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      window.localStorage.setItem('rag-users', JSON.stringify(updatedUsers));
      window.localStorage.setItem('rag-current-user', JSON.stringify({ name: newUser.name, email: newUser.email, phone: newUser.phone }));
      setSuccess('Account created successfully.');
      onLogin({ name: newUser.name, email: newUser.email, phone: newUser.phone });
      return;
    }

    const existingUser = users.find((u: any) => u.email.toLowerCase() === email && u.password === password);
    if (!existingUser) {
      setError('Invalid email or password.');
      return;
    }

    window.localStorage.setItem('rag-current-user', JSON.stringify({ name: existingUser.name, email: existingUser.email, phone: existingUser.phone }));
    onLogin({ name: existingUser.name, email: existingUser.email, phone: existingUser.phone });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-white">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp ? 'Sign up to access your chat assistant.' : 'Sign in to continue with your documents.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Full Name</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Email</label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
              <Mail className="mr-2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Phone Number</label>
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
                <Phone className="mr-2 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Password</label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
              <Lock className="mr-2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="ml-2 text-slate-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            {isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp((prev) => !prev);
              setError('');
              setSuccess('');
            }}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}
