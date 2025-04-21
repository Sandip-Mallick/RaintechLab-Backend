const express = require('express');
const { addClient, getClients, updateClient, deleteClient } = require('../controllers/clientController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, adminOnly, addClient);

router.get('/', protect, getClients);

router.put('/:id', protect, adminOnly, updateClient);

router.delete('/:id', protect, adminOnly, deleteClient);

module.exports = router;
