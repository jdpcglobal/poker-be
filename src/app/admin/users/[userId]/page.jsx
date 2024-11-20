// import { IUser } from '@/utils/pokerModelTypes';
// import mongoose from 'mongoose';
// import User from '@/models/user';
// import BankTransaction from '@/models/bankTransaction';
// import PokerGameArchive from '@/models/pokerGameArchive';

// interface UserDetailsProps {
//   user: IUser;
//   walletTransactions: any[];
//   pokerStats: any;
// }

// export const dynamic = 'force-dynamic'; // to make sure the page is server-rendered dynamically

// const UserDetails = async ({ params }: { params: { userId: string } }) => {
//   const { userId } = params;

//   // Fetch user data from MongoDB using Mongoose
//   const user = await User.findById(userId).exec();
//   if (!user) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex justify-center items-center">
//         <div className="text-xl font-bold text-red-600">User not found</div>
//       </div>
//     );
//   }

//   // Fetch wallet transactions related to the user
//   const walletTransactions = await BankTransaction.find({ userId }).exec();

//   // Fetch poker game statistics related to the user
//   const pokerGames = await PokerGameArchive.aggregate([
//     { $unwind: '$players' },
//     { $match: { 'players.userId': new mongoose.Types.ObjectId(userId) } },
//     { $group: {
//         _id: '$players.userId',
//         totalBet: { $sum: '$players.totalBet' },
//         gamesWon: { $sum: { $cond: [{ $eq: ['$status', 'finished'] }, 1, 0] } },
//         gamesPlayed: { $sum: 1 },
//     }},
//   ]);

//   const pokerStats = pokerGames[0] || { totalBet: 0, gamesWon: 0, gamesPlayed: 0 };

//   return (
//     <div className="min-h-screen bg-gray-100 p-8">
//       <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
//         <h1 className="text-4xl font-bold text-center mb-6">User Details</h1>

//         {/* User Basic Information */}
//         <div className="flex justify-center">
//           <div className="flex items-center space-x-4">
//             <div className="w-24 h-24 rounded-full bg-gray-300 flex justify-center items-center text-2xl text-white font-bold">
//               {user.username[0]}
//             </div>
//             <div>
//               <h2 className="text-2xl font-semibold">{user.username}</h2>
//               <p className="text-gray-500">{user.mobileNumber}</p>
//               <p className="text-gray-500 text-sm">Registered: {new Date(user.registrationDate).toLocaleDateString()}</p>
//             </div>
//           </div>
//         </div>

//         {/* Statistics and Status */}
//         <div className="mt-8">
//           <h3 className="text-xl font-semibold mb-4">Statistics</h3>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Games Played</h4>
//               <p className="text-2xl font-bold">{pokerStats.gamesPlayed}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Games Won</h4>
//               <p className="text-2xl font-bold">{pokerStats.gamesWon}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Total Bet</h4>
//               <p className="text-2xl font-bold">${pokerStats.totalBet.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Account Status</h4>
//               <p className={`text-2xl font-bold ${user.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
//                 {user.status}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Wallet Information */}
//         <div className="mt-8">
//           <h3 className="text-xl font-semibold mb-4">Wallet & Transactions</h3>
//           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Balance</h4>
//               <p className="text-2xl font-bold">${user.wallet.balance.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Bonus</h4>
//               <p className="text-2xl font-bold">${user.wallet.bonus.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Coins</h4>
//               <p className="text-2xl font-bold">{user.wallet.coins}</p>
//             </div>
//           </div>

//           {/* Wallet Transactions */}
//           <div className="mt-6">
//             <h4 className="text-lg font-medium text-gray-600">Recent Transactions</h4>
//             <div className="space-y-4">
//               {walletTransactions.map((txn, index) => (
//                 <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm">
//                   <p className="text-sm text-gray-500">{txn.createdOn.toLocaleString()}</p>
//                   <p className={`text-lg font-medium ${txn.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
//                     {txn.type} - ${txn.amount.toFixed(2)}
//                   </p>
//                   {txn.remark && <p className="text-sm text-gray-600">{txn.remark}</p>}
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UserDetails;


// app/user/[userId]/page.tsx

// import { IUser } from '@/utils/pokerModelTypes';
// import mongoose from 'mongoose';
// import User from '@/models/user';
// import BankTransaction from '@/models/bankTransaction';
// import PokerGameArchive from '@/models/pokerGameArchive';

// interface UserDetailsProps {
//   user: IUser;
//   bankTransactions: any[];
//   gameStats: any[];
// }

// export const dynamic = 'force-dynamic'; // to ensure page is server-rendered dynamically

// const UserDetails = async ({ params }: { params: { userId: string } }) => {
//   const { userId } = params;

//   // Fetch user data from MongoDB using Mongoose
//   const user = await User.findById(userId).exec();
  
//   if (!user) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex justify-center items-center">
//         <div className="text-xl font-bold text-red-600">User not found</div>
//       </div>
//     );
//   }

//   // Fetch bank transaction data for the user
//   const bankTransactions = await BankTransaction.find({ userId }).exec();

//   // Fetch game statistics for the user
//   const gameStats = await PokerGameArchive.aggregate([
//     { $unwind: "$players" },
//     { $match: { "players.userId": new mongoose.Types.ObjectId(userId) } },
//     {
//       $group: {
//         _id: "$players.userId",
//         totalBet: { $sum: "$players.totalBet" },
//         totalWinAmount: { $sum: { $sum: "$pots.winners.amount" } }
//       }
//     }
//   ]);

//   const userGameStats = gameStats[0] || { totalBet: 0, totalWinAmount: 0 };

//   return (
//     <div className="min-h-screen bg-gray-100 p-8">
//       <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
//         <h1 className="text-4xl font-bold text-center mb-6">User Details</h1>

//         <div className="flex justify-center">
//           <div className="flex items-center space-x-4">
//             <div className="w-24 h-24 rounded-full bg-gray-300 flex justify-center items-center text-2xl text-white font-bold">
//               {user.username[0]}
//             </div>
//             <div>
//               <h2 className="text-2xl font-semibold">{user.username}</h2>
//               <p className="text-gray-500">{user.mobileNumber}</p>
//               <p className={`text-xl font-semibold mt-2 ${user.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
//                 {user.status}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="mt-8">
//           <h3 className="text-xl font-semibold mb-4">Statistics</h3>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Games Played</h4>
//               <p className="text-2xl font-bold">{user.gamesPlayed}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Games Won</h4>
//               <p className="text-2xl font-bold">{user.gamesWon}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Total Bet Amount</h4>
//               <p className="text-2xl font-bold">${userGameStats.totalBet.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Total Win Amount</h4>
//               <p className="text-2xl font-bold">${userGameStats.totalWinAmount.toFixed(2)}</p>
//             </div>
//           </div>
//         </div>

//         <div className="mt-8">
//           <h3 className="text-xl font-semibold mb-4">Wallet Details</h3>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Balance</h4>
//               <p className="text-2xl font-bold">${user.wallet.balance.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Bonus</h4>
//               <p className="text-2xl font-bold">${user.wallet.bonus.toFixed(2)}</p>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//               <h4 className="text-lg font-medium text-gray-600">Coins</h4>
//               <p className="text-2xl font-bold">{user.wallet.coins}</p>
//             </div>
//           </div>
//         </div>

//         <div className="mt-8">
//           <h3 className="text-xl font-semibold mb-4">Bank Transactions</h3>
//           <div className="space-y-4">
//             {bankTransactions.length > 0 ? (
//               bankTransactions.map((transaction) => (
//                 <div key={transaction._id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
//                   <h4 className="text-lg font-medium text-gray-600">Transaction #{transaction._id}</h4>
//                   <p className="text-gray-500">Status: <span className={`font-semibold ${transaction.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>{transaction.status}</span></p>
//                   <p className="text-gray-500">Amount: ${transaction.amount.toFixed(2)}</p>
//                   <p className="text-gray-500">Type: {transaction.type}</p>
//                 </div>
//               ))
//             ) : (
//               <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
//                 <p>No bank transactions found</p>
//               </div>
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default UserDetails;
 

import { IUser } from '@/utils/pokerModelTypes';
import mongoose from 'mongoose';
import User from '@/models/user';
import BankTransaction from '@/models/bankTransaction';
import PokerGameArchive from '@/models/pokerGameArchive'; 

export const dynamic = 'force-dynamic'; // to ensure page is server-rendered dynamically

const UserDetails = async ({params}) => {
  const { userId } = params;

  // Fetch user data from MongoDB using Mongoose
  const user = await User.findById(userId).exec();
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="text-xl font-bold text-red-600">User not found</div>
      </div>
    );
  }

  // Fetch bank transaction data for the user
  const bankTransactions = await BankTransaction.find({ userId }).exec();

  // Fetch game statistics for the user
  const gameStats = await PokerGameArchive.aggregate([
    { $unwind: "$players" },
    { $match: { "players.userId": new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$players.userId",
        totalBet: { $sum: "$players.totalBet" },
        totalWinAmount: { $sum: { $sum: "$pots.winners.amount" } }
      }
    }
  ]);

  const userGameStats = gameStats[0] || { totalBet: 0, totalWinAmount: 0 };

  // Fetch wallet transactions from the user wallet subdocument
  const walletTransactions = user.wallet.transactions || [];

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
                      <td className={`px-4 py-2 ${txn.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
                        {txn.status}
                      </td>
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

