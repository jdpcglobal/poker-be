import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

const LatestGameHistory = () => {
  const [games, setGames] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('gameType'); // default sorting by game type
  const [sortDirection, setSortDirection] = useState('asc'); // default sort direction (ascending)

  const fetchGameData = async () => {
    try {
      const response = await axios.get('/api/admin/auth/getGamesList', {
        params: {
          pageNo,
          itemsPerPage,
        },
      });
      const formattedData = response.data.data.map((archive) => {
         const smallBlind = archive.bType === 'blinds' ? archive.stack : null;
         const bigBlind = archive.bType === 'blinds' ? archive.stack * 2 : null;

        return {
          deskName: archive.deskName,
          totalBet: archive.totalBet,
          smallBlind,
          bigBlind,
          createdAt: archive.createdAt,
          gameType: archive.gameType || 'Unknown', // Assuming 'gameType' is available in your data
        };
      });

      setGames(formattedData);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [pageNo, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPageNo(newPage);
    }
  };

  const handleSort = (column) => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortDirection(newDirection);

    const sortedGames = [...games].sort((a, b) => {
      if (a[column] < b[column]) return sortDirection === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setGames(sortedGames);
  };

  return (
    <div className="bg-white border border-blue-500 rounded-lg shadow p-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Latest Game History</h2>
        <button className="text-gray-400 hover:text-gray-600">&times;</button>
      </div>

      <div className="mb-4 flex items-center space-x-2">
        <label htmlFor="entries" className="text-sm text-gray-700">Show</label>
        <select
          id="entries"
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="border border-gray-300 rounded p-1 text-sm"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
        <span className="text-sm text-gray-700">entries</span>
      </div>

      <table className="w-full border border-gray-200 text-sm text-left">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="py-2 px-4">Desk Name</th>
            <th className="py-2 px-4">Total Bet</th>
            <th className="py-2 px-4">Small Blind</th>
            <th className="py-2 px-4">Big Blind</th>
            <th className="py-2 px-4 cursor-pointer" onClick={() => handleSort('gameType')}>
              Game Type {sortBy === 'gameType' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="py-2 px-4">Created At</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, index) => (
            <tr
              key={game.deskName}
              className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <td className="py-2 px-4">{game.deskName}</td>
              <td className="py-2 px-4">{game.totalBet}</td>
              <td className="py-2 px-4">{game.smallBlind !== null ? game.smallBlind : 'N/A'}</td>
              <td className="py-2 px-4">{game.bigBlind !== null ? game.bigBlind : 'N/A'}</td>
              <td className="py-2 px-4">{game.gameType}</td>
              <td className="py-2 px-4">{new Date(game.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {itemsPerPage * (pageNo - 1) + 1} to {Math.min(itemsPerPage * pageNo, totalItems)} of {totalItems} entries
        </p>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
            onClick={() => handlePageChange(pageNo - 1)}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
            onClick={() => handlePageChange(pageNo + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-4 flex space-x-4">
        <Link   href="/admin/gameList" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" >
          View All History
        </Link>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          View Monthly Graph
        </button>
      </div>
    </div>
  );
};

export default LatestGameHistory;
