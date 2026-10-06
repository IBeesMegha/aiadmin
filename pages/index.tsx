import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to admin panel...</p>
    </div>
  );
}
