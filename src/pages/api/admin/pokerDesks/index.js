import dbConnect from '../../../../config/dbConnect';
import PokerDesk from '../../../../models/pokerDesk';

export default async function handler(req, res) {
  const { method, query, body } = req;
  const { pokerModeId } = query;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        if (pokerModeId) {
          const pokerDesks = await PokerDesk.find({ pokerModeId });
          if (!pokerDesks.length) {
            return res.status(404).json({ message: 'Poker desks not found' });
          }
          return res.status(200).json(pokerDesks);
        }
        return res.status(400).json({ message: 'PokerModeId query parameter is required' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch poker desks', error });
      }
      break;

    case 'POST':
      try {
        const newPokerDesk = await PokerDesk.create(body);
        res.status(201).json(newPokerDesk);
      } catch (error) {
        res.status(500).json({ message: 'Failed to create poker desk', error });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
