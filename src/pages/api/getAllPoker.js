// pages/api/getAllPokerModes.ts
import dbConnect from '@/config/dbConnect';
import Poker from '../../models/poker';
import PokerMode from '../../models/pokerMode';
import { verifyToken } from '../../utils/jwt';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token is required' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      // Fetch all active pokers
      const pokers = await Poker.find({ status: { $in: ['active', 'maintenance'] } })
        .select('name rules description objective blindsOrAntes')
        .exec();

      // Prepare to gather poker modes for each poker
      const pokerModesPromises = pokers.map(async (poker) => {
        const pokerModes = await PokerMode.find({ pokerId: poker._id, status: 'active' })
          .limit(15)  // Limit to 15 poker modes
          .exec();

        const formattedPokerModes = pokerModes.map(mode => {
          const commonData = {
            minBuyIn: mode.minBuyIn,
            maxBuyIn: mode.maxBuyIn,
            maxPlayer: mode.maxPlayerCount,
            description: mode.description,
          };

          if (mode.blindsOrAntes === 'blinds') {
            return {
              ...commonData,
              smallBlind: mode.stake, // Assuming stake is used for both small and big blind
              bigBlind: mode.stake, // Example, you might need to handle it differently
            };
          } else if (mode.blindsOrAntes === 'antes') {
            return {
              ...commonData,
              anteAmount: mode.stake,
            };
          }

          return commonData;
        });

        return {
          pokerId: poker._id,
          name: poker.name,
          rules: poker.rules,
          status: poker.status,
          description: poker.description,
          objective: poker.objective,
          blindsOrAntes: poker.blindsOrAntes,
          pokerModes: formattedPokerModes,
        };
      });

      // Wait for all poker modes promises to resolve
      const pokerDetails = await Promise.all(pokerModesPromises);

      res.status(200).json(pokerDetails);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
