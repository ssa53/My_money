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

export default async function handler(req, res) {
  const { db } = await connectToDatabase();
  const collection = db.collection('assets');

  switch (req.method) {
    case 'GET':
      try {
        const { userId } = req.query;
        const assets = await collection.find({ userId }).toArray();
        res.status(200).json(assets);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
      }
      break;

    case 'POST':
      try {
        const asset = {
          ...req.body,
          userId: req.body.userId || 'user123', // 실제로는 세션에서 가져와야 함
          createdAt: new Date(),
          _id: Date.now().toString()
        };
        
        const result = await collection.insertOne(asset);
        res.status(201).json({ ...asset, _id: result.insertedId });
      } catch (error) {
        res.status(500).json({ error: 'Failed to create asset' });
      }
      break;

    case 'PUT':
      try {
        const { id } = req.query;
        const updateData = req.body;
        
        const result = await collection.updateOne(
          { _id: id },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          res.status(404).json({ error: 'Asset not found' });
        } else {
          res.status(200).json({ success: true });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to update asset' });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.query;
        
        const result = await collection.deleteOne({ _id: id });
        
        if (result.deletedCount === 0) {
          res.status(404).json({ error: 'Asset not found' });
        } else {
          res.status(200).json({ success: true });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete asset' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
