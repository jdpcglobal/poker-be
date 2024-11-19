'use client'

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function PokerGameArchiveAdminPanel() {
    const [data, setData] = useState([]);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [deskId, setDeskId] = useState('');
    const [username, setUsername] = useState('');
    const [startDate, setStartDate] = useState('2021-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        fetchData();
        fetchPokerGameData();
    }, [pageNo, itemsPerPage, deskId, username, startDate, endDate, sortBy, sortOrder]);

    const fetchData = async () => {
        try {
            const response = await axios.get('/api/admin/auth/getGamesList', {
                params: {
                    pageNo,
                    itemsPerPage,
                    deskId: deskId || undefined,
                    username: username || undefined,
                    startDate,
                    endDate,
                    sortBy,
                    sortOrder
                }
            });
            setData(response.data.data);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    const fetchPokerGameData = () => {
        // Construct the query parameters for the request
        const params = {
            deskId  
        };
    
        // Make the API request
        axios.get('/api/admin/auth/getGameData', { params })
            .then(response => {
                // Log the response to the console
                console.log('API Response:', response.data);
            })
            .catch(error => {
                // Handle error
                console.error('Error fetching poker game data:', error);
            });
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Poker Game Archive Admin Panel</h1>
            
            {/* Filters */}
            <div className="mb-4 flex gap-4">
                <input
                    type="text"
                    placeholder="Desk ID"
                    value={deskId}
                    onChange={(e) => setDeskId(e.target.value)}
                    className="border px-2 py-1"
                />
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border px-2 py-1"
                />
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border px-2 py-1"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border px-2 py-1"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border px-2 py-1"
                >
                    <option value="date">Date</option>
                    <option value="potAmount">Pot Amount</option>
                </select>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="border px-2 py-1"
                >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </select>
            </div>

            {/* Data Table */}
            <table className="min-w-full bg-white">
                <thead>
                    <tr>
                        <th className="px-4 py-2 border">Desk ID</th>
                        <th className="px-4 py-2 border">Players</th>
                        <th className="px-4 py-2 border">Pots</th>
                        <th className="px-4 py-2 border">totalBet</th>
                        <th className="px-4 py-2 border">Created At</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((archive) => (
                        <tr key={archive._id}>
                            <td className="px-4 py-2 border">{archive.tableId}</td>
                            
                            {/* Players Dropdown */}
                            <td className="px-4 py-2 border">
                                <details>
                                    <summary className="cursor-pointer">View Players</summary>
                                    <ul className="pl-4">
                                        {archive.players.map((player, index) => (
                                            <li key={index} className="border-t py-1">
                                                <strong>Username:</strong> {player.username || 'Unknown'}<br />
                                                <strong>Total Bet:</strong> {player.totalBet}<br />
                                                <strong>Status:</strong> {player.status}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </td>

                            {/* Pots Dropdown */}
                            <td className="px-4 py-2 border">
                                <details>
                                    <summary className="cursor-pointer">View Pots</summary>
                                    <ul className="pl-4">
                                        {archive.pots.map((pot, index) => (
                                            <li key={index} className="border-t py-1">
                                                <strong>Pot Amount:</strong> {pot.amount}<br />
                                                <strong>Winners:</strong>
                                                <ul className="pl-4">
                                                    {pot.winners.map((winner, i) => (
                                                        <li key={i}>
                                                            {winner.username || 'Unknown'}: {winner.amount}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </td>

                            <td className="px-4 py-2 border">{archive.totalBet}</td>
                            <td className="px-4 py-2 border">{new Date(archive.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
                <button
                    onClick={() => setPageNo((prev) => Math.max(prev - 1, 1))}
                    disabled={pageNo === 1}
                    className="border px-4 py-2"
                >
                    Previous
                </button>
                <span>Page {pageNo} of {totalPages}</span>
                <button
                    onClick={() => setPageNo((prev) => Math.min(prev + 1, totalPages))}
                    disabled={pageNo === totalPages}
                    className="border px-4 py-2"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
