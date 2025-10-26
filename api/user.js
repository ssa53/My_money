const { MongoClient } = require('mongodb');

// MongoDB 연결 함수
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('budget-app');
}

module.exports = async function handler(req, res) {
  try {
    const db = await connectToDatabase();
    
    if (req.method === 'GET') {
      try {
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
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
};
