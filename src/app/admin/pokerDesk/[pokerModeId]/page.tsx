'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

interface Seat {
  seatNumber: number;
  userId?: string;
  buyInAmount: number;
  balanceAtTable: number;
  isSittingOut: boolean;
}

interface PokerDesk {
  _id: string;
  pokerModeId: string;
  tableName: string;
  maxSeats: number;
  seats: Seat[];
  observers: string[];
  currentGameStatus: 'waiting' | 'in-progress' | 'finished';
  totalBuyIns: number;
  createdAt: Date;
  updatedAt: Date;
}

const PokerDeskAdmin: React.FC = () => {
  const params = useParams();
  const pokerModeId = params?.pokerModeId as string;
  const [pokerDesks, setPokerDesks] = useState<PokerDesk[]>([]);
  const [newPokerDesk, setNewPokerDesk] = useState<Omit<PokerDesk, '_id' | 'createdAt' | 'updatedAt'>>({
    pokerModeId,
    tableName: '',
    maxSeats: 0,
    seats: [],
    observers: [],
    currentGameStatus: 'waiting',
    totalBuyIns: 0
  });
  const [editingPokerDesk, setEditingPokerDesk] = useState<Partial<PokerDesk>>({});
  const [editingPokerDeskId, setEditingPokerDeskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (pokerModeId) {
      const fetchPokerDesks = async () => {
        try {
          const response = await axios.get(`/api/admin/pokerDesks`, { params: { pokerModeId } });
          setPokerDesks(response.data);
        } catch (error) {
          console.error('Failed to fetch poker desks:', error);
        }
      };

      fetchPokerDesks();
    }
  }, [pokerModeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewPokerDesk({ ...newPokerDesk, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPokerDesk.pokerModeId) {
      console.error('Poker Mode ID is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/pokerDesks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPokerDesk),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setPokerDesks([...pokerDesks, { ...newPokerDesk, _id: data._id } as PokerDesk]);
      setNewPokerDesk({
        pokerModeId: pokerModeId || '',
        tableName: '',
        maxSeats: 0,
        seats: [],
        observers: [],
        currentGameStatus: 'waiting',
        totalBuyIns: 0
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create poker desk:', error);
    }
  };

  const startEditing = (pokerDesk: PokerDesk) => {
    setEditingPokerDesk(pokerDesk);
    setEditingPokerDeskId(pokerDesk._id);
    setIsModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingPokerDesk({ ...editingPokerDesk, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPokerDeskId) return;

    try {
      const response = await fetch(`/api/admin/pokerDesks/${editingPokerDeskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPokerDesk),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      setPokerDesks(pokerDesks.map((p) => (p._id === editingPokerDeskId ? { ...editingPokerDesk, _id: editingPokerDeskId } as PokerDesk : p)));
      setEditingPokerDesk({});
      setEditingPokerDeskId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update poker desk:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/pokerDesks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Network response was not ok');
      setPokerDesks(pokerDesks.filter((pokerDesk) => pokerDesk._id !== id));
    } catch (error) {
      console.error('Failed to delete poker desk:', error);
    }
  };

  const cancelEditing = () => {
    setEditingPokerDesk({});
    setEditingPokerDeskId(null);
    setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Poker Desk Admin Panel</h1>

      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Create Poker Desk
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Seats</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Game Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Buy-Ins</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pokerDesks.map((pokerDesk) => (
              <tr key={pokerDesk._id}>
                <td className="px-6 py-4 whitespace-nowrap">{pokerDesk.tableName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{pokerDesk.maxSeats}</td>
                <td className="px-6 py-4 whitespace-nowrap">{pokerDesk.currentGameStatus}</td>
                <td className="px-6 py-4 whitespace-nowrap">{pokerDesk.totalBuyIns}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => startEditing(pokerDesk)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pokerDesk._id)}
                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">{editingPokerDeskId ? 'Edit Poker Desk' : 'Create Poker Desk'}</h2>
            <form onSubmit={editingPokerDeskId ? handleUpdate : handleSubmit}>
              <div className="mb-4">
                <label htmlFor="pokerModeId" className="block text-sm font-medium text-gray-700">Poker Mode ID</label>
                <p className="mt-1 text-sm text-gray-500">{pokerModeId}</p>
              </div>
              <div className="mb-4">
                <label htmlFor="tableName" className="block text-sm font-medium text-gray-700">Table Name</label>
                <input
                  id="tableName"
                  name="tableName"
                  type="text"
                  value={editingPokerDeskId ? editingPokerDesk.tableName : newPokerDesk.tableName}
                  onChange={editingPokerDeskId ? handleEditChange : handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="maxSeats" className="block text-sm font-medium text-gray-700">Max Seats</label>
                <input
                  id="maxSeats"
                  name="maxSeats"
                  type="number"
                  value={editingPokerDeskId ? editingPokerDesk.maxSeats : newPokerDesk.maxSeats}
                  onChange={editingPokerDeskId ? handleEditChange : handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="currentGameStatus" className="block text-sm font-medium text-gray-700">Current Game Status</label>
                <select
                  id="currentGameStatus"
                  name="currentGameStatus"
                  value={editingPokerDeskId ? editingPokerDesk.currentGameStatus : newPokerDesk.currentGameStatus}
                  onChange={editingPokerDeskId ? handleEditChange : handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="waiting">Waiting</option>
                  <option value="in-progress">In Progress</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="totalBuyIns" className="block text-sm font-medium text-gray-700">Total Buy-Ins</label>
                <input
                  id="totalBuyIns"
                  name="totalBuyIns"
                  type="number"
                  value={editingPokerDeskId ? editingPokerDesk.totalBuyIns : newPokerDesk.totalBuyIns}
                  onChange={editingPokerDeskId ? handleEditChange : handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingPokerDeskId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerDeskAdmin;
