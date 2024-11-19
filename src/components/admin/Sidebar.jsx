'use client'
import Link from 'next/link';
import { HomeIcon, UserIcon, CogIcon } from '@heroicons/react/outline';
import { useState } from 'react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`w-${collapsed ? '16' : '64'} bg-gray-800 text-white flex flex-col p-4 transition-width duration-300`}>
      <div className="text-xl font-bold mb-8">
        {collapsed ? (
          <span className="text-center">AP</span> // Abbreviation for "Admin Panel"
        ) : (
          'Admin Panel'
        )}
      </div>

      <ul className="space-y-4">
        <li>
          <Link href="/admin/dashboard" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
            <HomeIcon className="h-6 w-6" />
            {!collapsed && <span>Dashboard</span>}
          </Link>
        </li>
        <li>
          <Link href="/admin/users" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
            <UserIcon className="h-6 w-6" />
            {!collapsed && <span>Users</span>}
          </Link>
        </li>
        <li>
          <Link href="/admin/settings" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
            <CogIcon className="h-6 w-6" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </li>
        {/* Add more sidebar links as needed */}
      </ul>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-6 left-4 p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-all"
      >
        {collapsed ? '>' : '<'}
      </button>
    </div>
  );
};

export default Sidebar;
