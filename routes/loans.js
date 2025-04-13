const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Loan Schema
const loanSchema = new mongoose.Schema({
  borrowerName: String,
  amount: Number,
  interestRate: Number,
  term: {
    type: Number,
    required: function() { return this.loanType === 'personal'; }
  },
  startDate: Date,
  status: {
    type: String,
    enum: ['active', 'paid', 'defaulted'],
    default: 'active'
  },
  loanType: {
    type: String,
    enum: ['personal', 'gold', 'creditCard'],
    default: 'personal'
  },
  payments: [{
    amount: Number,
    date: Date,
    status: String
  }],
  prepayments: [{
    amount: Number,
    date: Date
  }],
  creditLimit: Number,
  cardNumber: String,
  outstanding: Number,
  spentHistory: [{
    amount: Number,
    date: Date,
    description: String
  }]
});

const Loan = mongoose.model('Loan', loanSchema);

// Get all loans
router.get('/', async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new loan
router.post('/', async (req, res) => {
  try {
    const loan = new Loan(req.body);
    const newLoan = await loan.save();
    res.status(201).json(newLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get loan by ID
router.get('/:id', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (loan) {
      res.json(loan);
    } else {
      res.status(404).json({ message: 'Loan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update loan
router.put('/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete loan
router.delete('/:id', async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add payment
router.post('/:id/payment', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    loan.payments.push(req.body);
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add prepayment
router.post('/:id/prepayment', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    loan.prepayments.push(req.body);
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 