'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/auth/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await axios.put(`/api/admin/auth/users/updateStatus`, { userId, status: newStatus });
      fetchUsers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleBonus = async (userId) => {
    // Logic to give bonus to the user
    console.log(`Giving bonus to user with ID: ${userId}`);
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`/api/admin/auth/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter((user) => {
    return (
      (searchTerm === '' || user.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedStatus === '' || user.status === selectedStatus) &&
      (dateFilter === '' || new Date(user.createdOn).toISOString().split('T')[0] === dateFilter)
    );
  });

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
          <input
            type="text"
            placeholder="Search by username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Filter by Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
  <p className="text-center text-gray-500">Loading users...</p>
) : (
  <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
    <thead>
      <tr className="bg-gray-200 text-gray-600 text-sm uppercase font-semibold">
        <th className="p-3 text-left">Username</th>
        <th className="p-3 text-left">Mobile Number</th>
        <th className="p-3 text-left">Wallet Balance</th>
        <th className="p-3 text-left">Total Deposit</th>
        <th className="p-3 text-left">Total Withdraw</th>
        <th className="p-3 text-left">Games Played</th>
        <th className="p-3 text-left">Games Won</th>
        <th className="p-3 text-left">Total Bet</th>
        <th className="p-3 text-left">Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredUsers.map((user) => (
        <tr key={user._id} className="border-b hover:bg-gray-50">
          <td className="p-3">{user.username}</td>
          <td className="p-3">{user.mobileNumber}</td>
          <td className="p-3">${user.walletBalance}</td>
          <td className="p-3">${user.totalDeposit}</td>
          <td className="p-3">${user.totalWithdraw}</td>
          <td className="p-3">{user.gamesPlayed}</td>
          <td className="p-3">{user.gamesWon}</td>
          <td className="p-3">${user.totalBet}</td>
          {/* <td className="p-3 space-x-2">
            <button
              onClick={() => handleBonus(user._id)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Bonus
            </button>
            <button
              onClick={() => console.log(`Editing user: ${user._id}`)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(user._id)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={() => console.log(`Details of user: ${user._id}`)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Details
            </button>
          </td> */}
          <td className="p-3">
  <div className="grid grid-cols-2 gap-2">
    <button
      onClick={() => handleBonus(user._id)}
      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
    >
      Bonus
    </button>
    <button
      onClick={() => console.log(`Editing user: ${user._id}`)}
      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Edit
    </button>
    <button
      onClick={() => handleDelete(user._id)}
      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Delete
    </button>
    <button
      onClick={() => console.log(`Details of user: ${user._id}`)}
      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
    >
      Details
    </button>
  </div>
</td>

        </tr>
      ))}
    </tbody>
  </table>
)}

    </div>
  );
};

export default UserManagementPage;
