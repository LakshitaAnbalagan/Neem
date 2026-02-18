const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { getAssistantReply } = require('../services/assistant');

const router = express.Router();

function conversationId(a, b) {
  const ids = [a.toString(), b.toString()].sort();
  return ids.join('_');
}

router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Chat.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', last: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$last' } },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'senderId', foreignField: '_id', as: 'sender' } },
      { $lookup: { from: 'users', localField: 'receiverId', foreignField: '_id', as: 'receiver' } },
      { $unwind: '$sender' },
      { $unwind: '$receiver' }
    ]);
    const list = messages.map(m => {
      const other = m.senderId.toString() === userId.toString() ? m.receiver : m.sender;
      return {
        conversationId: m.conversationId,
        otherUser: { _id: other._id, name: other.name, email: other.email, role: other.role, businessName: other.businessName },
        lastMessage: { content: m.content, createdAt: m.createdAt, isFromShop: m.isFromShop }
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assistant', auth, async (req, res) => {
  try {
    const message = req.body?.message;
    const userInfo = {
      role: req.user?.role || 'shop',
      userId: req.user?._id?.toString()
    };
    const { reply } = await getAssistantReply(message, userInfo);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Assistant unavailable.' });
  }
});

router.get('/:otherId/messages', auth, async (req, res) => {
  try {
    const cid = conversationId(req.user._id, req.params.otherId);
    const messages = await Chat.find({ conversationId: cid }).sort({ createdAt: 1 }).lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
