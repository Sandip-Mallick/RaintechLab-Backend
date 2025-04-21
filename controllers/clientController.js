const Client = require('../models/Client');

// Get All Clients
exports.getClients = async (req, res) => {
    try {
        const clients = await Client.find();
        res.status(200).json(clients);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve clients', error: err.message });
    }
};

// Add New Client
exports.addClient = async (req, res) => {
    try {
        const client = await Client.create(req.body);
        res.status(201).json(client);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to add client', error: err.message });
    }
};

// Update Client
exports.updateClient = async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedClient);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update client', error: err.message });
    }
};

// Delete Client
exports.deleteClient = async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.status(200).json({ msg: 'Client deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete client', error: err.message });
    }
};
