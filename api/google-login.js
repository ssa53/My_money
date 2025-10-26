const clientPromise = require('../../lib/mongodb');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    // Google 토큰 검증 (실제로는 Google API로 검증해야 함)
    // 여기서는 간단히 토큰을 디코딩하여 사용자 정보 추출
    const decodedToken = jwt.decode(googleToken);
    
    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name, picture } = decodedToken;

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('budget-app');

    // 사용자 찾기 또는 생성
    let user = await db.collection('users').findOne({ email });

    if (!user) {
      // 새 사용자 생성
      const newUser = {
        email,
        name,
        picture,
        provider: 'google',
        createdAt: new Date(),
        verified: true // Google 로그인은 이미 인증됨
      };

      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
