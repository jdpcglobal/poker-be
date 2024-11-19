import Link from 'next/link';
import { Inter } from 'next/font/google';
import '../globals.css';
import Sidebar from '../../components/admin/Sidebar';
import Header from '../../components/admin/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Admin Panel',
  description: 'Admin Panel Dashboard',
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-100" >
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <Header />

            {/* Content Area */}
            <main className="flex-1 px-6 bg-white">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
};

export default AdminLayout;
