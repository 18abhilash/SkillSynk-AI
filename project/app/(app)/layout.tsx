import { Navbar } from '@/components/navbar';
import { RouteGuard } from '@/components/route-guard';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
      </div>
    </RouteGuard>
  );
}
