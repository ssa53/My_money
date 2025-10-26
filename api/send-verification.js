import clientPromise from '../../lib/mongodb';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('budget-app');

    // 사용자 존재 확인
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 인증번호를 데이터베이스에 저장 (5분 만료)
    await db.collection('verification_codes').insertOne({
      email,
      code: verificationCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분 후 만료
      used: false
    });

    // 이메일 발송 (SendGrid 사용)
    const transporter = nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@budget-app.com',
      to: email,
      subject: '간단 가계부 - 비밀번호 재설정 인증번호',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5c67f2;">간단 가계부</h2>
          <p>비밀번호 재설정을 위한 인증번호입니다.</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #5c67f2; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>이 인증번호는 5분 후에 만료됩니다.</p>
          <p>만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시하세요.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
