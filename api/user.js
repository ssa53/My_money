import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      
      // 간단한 사용자 정보 반환 (실제로는 세션에서 가져와야 함)
      const user = {
        nickname: '사용자',
        id: 'user123'
      };
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user info' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection('users');
      
      const user = {
        ...req.body,
        createdAt: new Date()
      };
      
      // 사용자가 이미 존재하는지 확인
      const existingUser = await collection.findOne({ id: user.id });
      if (existingUser) {
        res.status(200).json(existingUser);
      } else {
        const result = await collection.insertOne(user);
        res.status(201).json({ ...user, _id: result.insertedId });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
