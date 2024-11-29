'use client'

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
interface IBankTransaction {
  _id: string;
  userId: { username: string; mobileNumber: string };
  amount: number;
  type: 'deposit' | 'withdraw';
  status: 'failed' | 'completed' | 'successful' | 'waiting';
  bankId: { bankName: string; accountHolderName: string };
  remark: string;
}

const BankTransactions = () => {
  const [transactions, setTransactions] = useState<IBankTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {

    const fetchTransactions = async () => {
      
      try {
         // Replace 'token' with your actual cookie name
        const response = await axios.get('/api/admin/auth/getBankTransactions', {
          params: { page, limit: itemsPerPage }, 
        });
        setTransactions(response.data.transactions);
        setTotalPages(Math.ceil(response.data.totalCount / itemsPerPage));
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [page]);

  const changeTransactionStatus = async (transactionId: string, newStatus: 'failed' | 'completed' | 'successful' | 'waiting') => {
    try {
      await axios.put('/api/admin/auth/updateTransactionStatus', {
        transactionId,
        newStatus,
      });

      setTransactions((prevTransactions) =>
        prevTransactions.map((transaction) =>
          transaction._id === transactionId
            ? { ...transaction, status: newStatus }
            : transaction
        )
      );
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  return (
    <div className="p-8 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">Bank Transactions</h2>

      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
          <tr>
            <th className="py-3 px-6 text-left">Username</th>
            <th className="py-3 px-6 text-left">Amount</th>
            <th className="py-3 px-6 text-left">Type</th>
            <th className="py-3 px-6 text-left">Status</th>
            <th className="py-3 px-6 text-left">Bank Info</th>
            <th className="py-3 px-6 text-left">Action</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm font-light">
          {transactions.map((transaction) => (
            <tr key={transaction._id} className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-3 px-6">{transaction.userId.username}</td>
              <td className="py-3 px-6">${transaction.amount.toLocaleString()}</td>
              <td className="py-3 px-6">{transaction.type}</td>
              <td className="py-3 px-6">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    transaction.status === 'waiting'
                      ? 'bg-yellow-200 text-yellow-800'
                      : transaction.status === 'completed'
                      ? 'bg-green-200 text-green-800'
                      : transaction.status === 'successful'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {transaction.status}
                </span>
              </td>
              <td className="py-3 px-6">
                {transaction.bankId.bankName} - {transaction.bankId.accountHolderName}
              </td>
              <td className="py-3 px-6">
                <select
                  className="bg-gray-200 text-gray-700 p-2 rounded-md focus:outline-none"
                  value={transaction.status}
                  onChange={(e) => changeTransactionStatus(transaction._id, e.target.value as 'failed' | 'completed' | 'successful' | 'waiting')}
                >
                  <option value="waiting">Waiting</option>
                  <option value="completed">Completed</option>
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between mt-8 items-center">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className={`px-4 py-2 bg-gray-300 rounded-lg ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-400'}`}
        >
          Previous
        </button>
        <span className="text-gray-700 font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page === totalPages}
          className={`px-4 py-2 bg-gray-300 rounded-lg ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-400'}`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default BankTransactions;
