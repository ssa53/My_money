import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const userId = req.query.userId || 'user123'; // 실제로는 세션에서 가져와야 함
    
    // 사용자의 모든 거래내역과 자산 삭제
    await Promise.all([
      db.collection('transactions').deleteMany({ userId }),
      db.collection('assets').deleteMany({ userId })
    ]);
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear data' });
  }
}
