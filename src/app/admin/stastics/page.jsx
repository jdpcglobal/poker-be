'use client'
import { useEffect, useState } from 'react';
import { HomeIcon, UserIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/outline';
import Chart from 'react-apexcharts'; // For graphs, we'll use a charting library like ApexCharts

const Dashboard = () => {
  const [data, setData] = useState(null);

  // Fetch data from the API
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/admin/auth/getStastics'); // Adjust the API endpoint as needed
      const result = await res.json();
      console.log(result)
      setData(result.data);
    };
    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  // Statistics Data
  const { userStats, bankTransactionStats, pokerGameStats } = data;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Stats */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <UserIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">User Stats</h2>
              <p className="text-sm text-gray-500">Total Users: {userStats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Users:</span>
              <span>{userStats.activeUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Inactive Users:</span>
              <span>{userStats.inactiveUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suspended Users:</span>
              <span>{userStats.suspendedUsers}</span>
            </div>
          </div>
        </div>

        {/* Bank Transaction Stats */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Bank Transaction Stats</h2>
              <p className="text-sm text-gray-500">Total Deposit Failed: ₹{bankTransactionStats.totalDepositFailed}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Deposit Successful:</span>
              <span>{bankTransactionStats.totalDepositSuccessful}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Withdraw Successful:</span>
              <span>{bankTransactionStats.totalWithdrawSuccessful}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Withdraw Failed:</span>
              <span>{bankTransactionStats.totalWithdrawFailed}</span>
            </div>
          </div>
        </div>

        {/* Poker Game Stats */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <ClockIcon className="h-8 w-8 text-purple-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Poker Game Stats</h2>
              <p className="text-sm text-gray-500">Active Poker Games: {pokerGameStats.totalActivePokerGames}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Finished Poker Games:</span>
              <span>{pokerGameStats.totalFinishedPokerGames}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pot in Active Games:</span>
              <span>₹{pokerGameStats.totalPotInActiveGames}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Top Players by Total Bet:</span>
              <span>{pokerGameStats.topPlayersByTotalBet.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart for Total Deposit vs Total Withdraw */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Bank Transaction Overview</h2>
        <Chart
          options={{
            chart: { type: 'bar' },
            xaxis: { categories: ['Deposit', 'Withdraw'] },
          }}
          series={[
            {
              name: 'Successful',
              data: [
                bankTransactionStats.totalDepositSuccessful,
                bankTransactionStats.totalWithdrawSuccessful,
              ],
            },
            {
              name: 'Failed',
              data: [
                bankTransactionStats.totalDepositFailed,
                bankTransactionStats.totalWithdrawFailed,
              ],
            },
          ]}
          type="bar"
          height={350}
        />
      </div>

      {/* Top Players By Total Bet */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Top Players by Total Bet</h2>
        <table className="min-w-full mt-4 table-auto">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Player ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Bet (₹)</th>
            </tr>
          </thead>
          <tbody>
            {pokerGameStats.topPlayersByTotalBet.map((player) => (
              <tr key={player._id}>
                <td className="px-6 py-4 text-sm text-gray-800">{player._id}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{player.totalBet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
