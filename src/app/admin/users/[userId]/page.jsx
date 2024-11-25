'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const UserDetails = () => {
  const { query } = useRouter();
  const { userId } = query;

  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) return;

    // Fetch user details from the API
    const fetchUserDetails = async () => {
      try {
        const response = await fetch('/api/admin/auth/users/getUserDetails', { // Assuming '/api/user/details' as a general endpoint
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }), // Send userId in the request body
        });
    
        const data = await response.json();
        if (response.ok) {
          setUserDetails(data);
        } else {
          alert(data.message || 'Error fetching user details');
        }
      } catch (error) {
        alert('Error fetching user details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserDetails();
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userDetails) {
    return <div>User not found</div>;
  }

  const { user, bankTransactions, userGameStats, walletTransactions } = userDetails;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-4xl font-bold text-center mb-6">User Details</h1>

        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 rounded-full bg-gray-300 flex justify-center items-center text-2xl text-white font-bold">
              {user.username[0]}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{user.username}</h2>
              <p className="text-gray-500">{user.mobileNumber}</p>
              <p className={`text-xl font-semibold mt-2 ${user.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                {user.status}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Games Played</h4>
              <p className="text-2xl font-bold">{user.gamesPlayed}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Games Won</h4>
              <p className="text-2xl font-bold">{user.gamesWon}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Total Bet Amount</h4>
              <p className="text-2xl font-bold">${userGameStats.totalBet.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Total Win Amount</h4>
              <p className="text-2xl font-bold">${userGameStats.totalWinAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Wallet Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Balance</h4>
              <p className="text-2xl font-bold">${user.wallet.balance.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Bonus</h4>
              <p className="text-2xl font-bold">${user.wallet.bonus.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-medium text-gray-600">Coins</h4>
              <p className="text-2xl font-bold">{user.wallet.coins}</p>
            </div>
          </div>
        </div>

        {/* Wallet Transactions Dropdown */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Wallet Transactions</h3>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer text-lg font-medium text-gray-700">Show Wallet Transactions</summary>
              <div className="mt-2 space-y-2">
                {walletTransactions.length > 0 ? (
                  walletTransactions.map((txn, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">{txn.createdOn.toLocaleString()}</p>
                      <p className={`text-lg font-medium ${txn.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
                        {txn.type} - ${txn.amount.toFixed(2)}
                      </p>
                      {txn.remark && <p className="text-sm text-gray-600">{txn.remark}</p>}
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <p>No wallet transactions found</p>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* Bank Transactions Table */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Bank Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto bg-gray-50">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Transaction ID</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {bankTransactions.length > 0 ? (
                  bankTransactions.map((txn) => (
                    <tr key={txn._id}>
                      <td className="px-4 py-2">{txn._id}</td>
                      <td className="px-4 py-2">${txn.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">{txn.type}</td>
                      <td className="px-4 py-2">{txn.status}</td>
                      <td className="px-4 py-2">{txn.createdOn.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center">No bank transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
