/**
 * 403 Access Denied Page
 * Shown when user doesn't have required permissions
 */

import React from 'react';
import { Layout } from '@/components/admin/Layout';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function AccessDenied() {
  const router = useRouter();

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Go Back</span>
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
