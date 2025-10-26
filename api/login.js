const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // MongoDB 연결
    const db = await connectToDatabase();

    // 사용자 찾기
    const user = await db.collection('users').findOne({ 
      email,
      verified: true // 인증된 사용자만 로그인 가능
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 로그인 성공
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
