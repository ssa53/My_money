const clientPromise = require('../../lib/mongodb');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('budget-app');

    // 이메일 중복 확인
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 이메일 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 사용자 데이터 생성 (인증 전까지는 임시 상태)
    const newUser = {
      username,
      email,
      password: hashedPassword,
      verified: false,
      verificationCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10분 후 만료
    };

    // 사용자 저장
    await db.collection('users').insertOne(newUser);

    // 이메일 발송
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
      subject: '간단 가계부 - 이메일 인증',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5c67f2;">간단 가계부</h2>
          <p>안녕하세요, ${username}님!</p>
          <p>회원가입을 완료하기 위해 이메일 인증이 필요합니다.</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #5c67f2; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>이 인증번호는 10분 후에 만료됩니다.</p>
          <p>인증번호를 입력하여 회원가입을 완료해주세요.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'User created successfully. Please check your email for verification code.',
      userId: newUser._id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
