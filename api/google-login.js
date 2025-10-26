const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// MongoDB 연결 함수
async function connectToDatabase() {
  // 임시 하드코딩 (테스트용)
  const uri = process.env.MONGODB_URI || 'mongodb+srv://test:test@cluster0.mongodb.net/budget-app?retryWrites=true&w=majority';
  
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
    // 환경변수 디버깅
    console.log('Environment variables check:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Google JWT 토큰 검증 및 디코딩
    const decodedToken = jwt.decode(credential);
    
    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    // 토큰 유효성 검증 (issuer, audience 체크)
    if (decodedToken.iss !== 'https://accounts.google.com') {
      return res.status(401).json({ message: 'Invalid token issuer' });
    }

    if (decodedToken.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Invalid token audience' });
    }

    const { email, name, picture, sub } = decodedToken;

    // MongoDB 연결
    const db = await connectToDatabase();

    // 사용자 찾기 또는 생성
    let user = await db.collection('users').findOne({ email });

    if (!user) {
      // 새 사용자 생성
      const newUser = {
        email,
        name,
        picture,
        googleId: sub,
        provider: 'google',
        createdAt: new Date(),
        verified: true // Google 로그인은 이미 인증됨
      };

      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // 기존 사용자 정보 업데이트
      await db.collection('users').updateOne(
        { email },
        { 
          $set: { 
            name,
            picture,
            googleId: sub,
            lastLogin: new Date()
          }
        }
      );
      user = { ...user, name, picture, googleId: sub };
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
