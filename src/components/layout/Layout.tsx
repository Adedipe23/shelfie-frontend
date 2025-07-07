import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { BaseComponentProps } from '../../types';

const Layout: React.FC<BaseComponentProps> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
