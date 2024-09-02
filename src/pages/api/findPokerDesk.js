import dbConnect from '@/config/dbConnect';
import PokerDesk from '../../models/pokerDesk';
import { verifyToken } from '@/utils/jwt';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];
    const { pokerModeId } = req.body;
    
    if (!token) {
      return res.status(401).json({ message: 'Token is required' });
    }

    if (!pokerModeId) {
      return res.status(400).json({ message: 'Poker mode ID is required' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      if (!mongoose.Types.ObjectId.isValid(pokerModeId)) {
        return res.status(400).json({ message: 'Invalid Poker Mode ID' });
      }
      
      // Find all poker desks for the given pokerModeId
      const pokerDesks = await PokerDesk.find({ pokerModeId }).exec();

      if (pokerDesks.length === 0) {
        return res.status(404).json({ message: 'No poker desks available for the specified poker mode' });
      }

      // Sort the desks in memory based on seats and observers
      const sortedDesks = pokerDesks
        .filter(desk => desk.seats.length > 0 && desk.seats.length <= desk.maxSeats * 0.75)
        .sort((a, b) => {
          // First, sort by number of seats
          if (a.seats.length !== b.seats.length) {
            return a.seats.length - b.seats.length;
          }
          // Then, sort by number of observers
          return a.observers.length - b.observers.length;
        });

      // If no desks meet the criteria, return the first one
      const bestDesk = sortedDesks[0] || pokerDesks[0];

      res.status(200).json({
        tableId: bestDesk._id,
        message: 'Best table found',
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
      console.log(error);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
