let mongoose = require('mongoose');

let emailSchema = new mongoose.Schema({
    email: String
});

module.exports = mongoose.model('Email', emailSchema);