/**
 * Admin Login Page
 * /admin/login
 * Provides authentication UI for admin users
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';

// Validation schema
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { theme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      await login(data.email, data.password);
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const loginBgStyle = theme?.loginBackground
    ? { backgroundImage: `url(${theme.loginBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative"
      style={Object.keys(loginBgStyle).length ? loginBgStyle : { background: 'linear-gradient(to bottom right, #111827, #1f2937, #111827)' }}
    >
      {theme?.loginBackground && <div className="absolute inset-0 bg-black/50" />}
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          {theme?.loginLogo ? (
            <div className="mx-auto flex items-center justify-center mb-4">
              <img src={theme.loginLogo} alt="Logo" className="max-h-16" />
            </div>
          ) : (
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
          )}
          <h2 className="text-3xl font-bold text-white">
            {theme?.loginTitle || 'CMS Admin Panel'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {theme?.loginSubtitle || 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.email
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && (
                <div className="mt-2 flex items-center text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.email.message}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`block w-full pl-10 pr-12 py-3 border ${
                    errors.password
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="mt-2 flex items-center text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-xs text-gray-400 font-semibold mb-2">
              Demo Credentials:
            </p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>
                <span className="text-gray-400">Email:</span> admin@example.com
              </p>
              <p>
                <span className="text-gray-400">Password:</span> Admin@123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          © 2026 CMS Admin Panel. All rights reserved.
        </p>
      </div>
    </div>
  );
}
