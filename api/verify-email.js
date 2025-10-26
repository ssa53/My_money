const clientPromise = require('../../lib/mongodb');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('budget-app');

    // 사용자 찾기 및 인증번호 확인
    const user = await db.collection('users').findOne({
      email,
      verificationCode,
      verified: false,
      expiresAt: { $gt: new Date() } // 만료되지 않은 것만
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // 사용자 인증 완료 처리
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          verified: true,
          verifiedAt: new Date()
        },
        $unset: { 
          verificationCode: 1,
          expiresAt: 1
        }
      }
    );

    res.status(200).json({ 
      message: 'Email verified successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
