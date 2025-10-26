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
    const verificationRecord = await db.collection('verification_codes').findOne({
      code,
      used: false,
      expiresAt: { $gt: new Date() } // 만료되지 않은 것만
    });

    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 사용자 비밀번호 업데이트
    await db.collection('users').updateOne(
      { email: verificationRecord.email },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // 인증번호 사용 처리
    await db.collection('verification_codes').updateOne(
      { _id: verificationRecord._id },
      { $set: { used: true } }
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
