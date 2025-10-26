const clientPromise = require('../../lib/mongodb');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
      return res.status(400).json({ message: 'Code and new password are required' });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('budget-app');

    // 인증번호 확인
    const resetRecord = await db.collection('password_resets').findOne({
      code,
      used: false,
      expiresAt: { $gt: new Date() } // 만료되지 않은 것만
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 사용자 비밀번호 업데이트
    await db.collection('users').updateOne(
      { email: resetRecord.email },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );

    // 인증번호 사용 처리
    await db.collection('password_resets').updateOne(
      { _id: resetRecord._id },
      { $set: { used: true } }
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
