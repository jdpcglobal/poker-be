'use client'
import Link from 'next/link';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import useSocket from '../../../hooks/useSocket'
interface Poker {
  _id: string;
  name: string;
  communityCardsCount: number;
  maxHoleCards: number;
  numberOfRounds: number;
  bType: 'Blinds' | 'Antes' | 'both';
  objective: string;
  status: 'active' | 'maintenance' | 'disable';
}

const PokerAdmin: React.FC = () => {
  const [pokers, setPokers] = useState<Poker[]>([]);
  const [newPoker, setNewPoker] = useState<Omit<Poker, '_id'>>({
    name: '',
    communityCardsCount: 0,
    maxHoleCards: 2,
    numberOfRounds: 0,
    bType: 'Blinds',
    objective: '',
    status: 'active',
  });
  const [editingPoker, setEditingPoker] = useState<Partial<Omit<Poker, '_id'>> | null>(null);
  const [editingPokerId, setEditingPokerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
   const socket = useSocket("tattvamasi");
  useEffect(() => {
    // Fetch existing poker games from your backend
    fetch('/api/admin/poker')
      .then((response) => response.json())
      .then((data: Poker[]) => setPokers(data));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewPoker({ ...newPoker, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch('/api/admin/createPoker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPoker),
    }).then(() => {
      setPokers([...pokers, { ...newPoker, _id: '' } as Poker]); // Placeholder _id
      setNewPoker({
        name: '',
        communityCardsCount: 0,
        maxHoleCards: 2,
        numberOfRounds: 0,
        bType: 'Blinds',
        objective: '',
        status: 'active',
      });
      setIsModalOpen(false); // Close the modal after submission
    });
  };

  const startEditing = (poker: Poker) => {
    setEditingPoker({
      name: poker.name,
      communityCardsCount: poker.communityCardsCount,
      maxHoleCards: poker.maxHoleCards,
      numberOfRounds: poker.numberOfRounds,
      bType: poker.bType,
      objective: poker.objective,
      status: poker.status,
    });
    setEditingPokerId(poker._id);
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingPoker) {
      setEditingPoker({ ...editingPoker, [e.target.name]: e.target.value });
    }
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingPokerId && editingPoker) {
      fetch(`/api/admin/editPoker/${editingPokerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPoker),
      }).then(() => {
        setPokers(pokers.map((p) => (p._id === editingPokerId ? { ...editingPoker, _id: editingPokerId } as Poker : p)));
        setEditingPoker(null);
        setEditingPokerId(null);
      });
    }
  };

  const handleDelete = (id: string) => {
    fetch(`/api/admin/deletePoker/${id}`, { method: 'DELETE' }).then(() => {
      setPokers(pokers.filter((poker) => poker._id !== id));
    });
  };

  const cancelEditing = () => {
    setEditingPoker(null);
    setEditingPokerId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Poker Admin Panel</h1>
      
      {/* Button to open the modal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Create Poker Game
      </button>

      {/* Modal for creating poker game */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">api/admin/poker Poker Game</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newPoker.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Community Cards Count:</label>
                <input
                  type="number"
                  name="communityCardsCount"
                  value={newPoker.communityCardsCount}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Hole Cards:</label>
                <input
                  type="number"
                  name="maxHoleCards"
                  value={newPoker.maxHoleCards}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Number of Rounds:</label>
                <input
                  type="number"
                  name="numberOfRounds"
                  value={newPoker.numberOfRounds}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Blinds or Antes:</label>
                <select
                  name="blindsOrAntes"
                  value={newPoker.bType}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Blinds">Blinds</option>
                  <option value="Antes">Antes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Objective:</label>
                <input
                  type="text"
                  name="objective"
                  value={newPoker.objective}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Status:</label>
                <select
                  name="status"
                  value={newPoker.status}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disable">Disable</option>
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create Poker Game
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List of Poker Games */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Poker Games</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-gray-100 border-b">Name</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Community Cards</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Max Hole Cards</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Rounds</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Blinds/Antes</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Objective</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Status</th>
                <th className="py-2 px-4 bg-gray-100 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pokers.map((poker) => (
                <tr key={poker._id}>
                  <td className="py-2 px-4 border-b">{poker.name}</td>
                  <td className="py-2 px-4 border-b">{poker.communityCardsCount}</td>
                  <td className="py-2 px-4 border-b">{poker.maxHoleCards}</td>
                  <td className="py-2 px-4 border-b">{poker.numberOfRounds}</td>
                  <td className="py-2 px-4 border-b">{poker.bType}</td>
                  <td className="py-2 px-4 border-b">{poker.objective}</td>
                  <td className="py-2 px-4 border-b">{poker.status}</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => startEditing(poker)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(poker._id)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                    <Link href={`/admin/pokerMode/${poker._id}`}>
                     details
                     </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal for editing poker game */}
      {editingPoker && editingPokerId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Edit Poker Game</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name:</label>
                <input
                  type="text"
                  name="name"
                  value={editingPoker.name || ''}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Community Cards Count:</label>
                <input
                  type="number"
                  name="communityCardsCount"
                  value={editingPoker.communityCardsCount || 0}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Hole Cards:</label>
                <input
                  type="number"
                  name="maxHoleCards"
                  value={editingPoker.maxHoleCards || 2}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Number of Rounds:</label>
                <input
                  type="number"
                  name="numberOfRounds"
                  value={editingPoker.numberOfRounds || 0}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Blinds or Antes:</label>
                <select
                  name="blindsOrAntes"
                  value={editingPoker.bType || 'Blinds'}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Blinds">Blinds</option>
                  <option value="Antes">Antes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Objective:</label>
                <input
                  type="text"
                  name="objective"
                  value={editingPoker.objective || ''}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Status:</label>
                <select
                  name="status"
                  value={editingPoker.status || 'active'}
                  onChange={handleEditChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disable">Disable</option>
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Update Poker Game
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerAdmin;
