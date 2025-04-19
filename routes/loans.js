const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

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
    console.log('Received loan creation request:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      path: req.path
    });
    
    // Validate required fields
    const { borrowerName, amount, startDate, loanType } = req.body;
    console.log('Extracted fields:', { borrowerName, amount, startDate, loanType });
    
    if (!borrowerName || !amount || !startDate || !loanType) {
      console.log('Missing required fields:', {
        borrowerName: !borrowerName,
        amount: !amount,
        startDate: !startDate,
        loanType: !loanType
      });
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['borrowerName', 'amount', 'startDate', 'loanType'],
        received: req.body 
      });
    }

    // Validate loan type specific fields
    if (loanType === 'personal' && !req.body.term) {
      console.log('Missing term for personal loan');
      return res.status(400).json({ 
        message: 'Term is required for personal loans',
        received: req.body 
      });
    }

    console.log('Creating new loan with data:', req.body);
    const loan = new Loan(req.body);
    console.log('Loan model instance created:', loan);
    
    const newLoan = await loan.save();
    console.log('Loan saved successfully:', newLoan);
    res.status(201).json(newLoan);
  } catch (error) {
    console.error('Error creating loan:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(400).json({ 
      message: error.message,
      details: error.errors || {},
      receivedData: req.body 
    });
  }
});

// Get loan by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
    const loan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete loan
router.delete('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
    await Loan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add payment
router.post('/:id/payment', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Add the prepayment
    loan.prepayments.push(req.body);

    // Calculate total paid amount (including prepayments)
    const totalPrepaid = loan.prepayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyRate = loan.interestRate / 100 / 12;
    let remainingAmount = loan.amount;
    let accumulatedInterest = 0;

    // Calculate remaining amount and interest
    if (loan.loanType === 'personal') {
      const emi = (loan.amount * monthlyRate * Math.pow(1 + monthlyRate, loan.term)) / 
                 (Math.pow(1 + monthlyRate, loan.term) - 1);
      const totalInterest = (emi * loan.term) - loan.amount;
      remainingAmount = loan.amount + totalInterest - totalPaid - totalPrepaid;
    } else {
      // For gold loans and credit cards
      accumulatedInterest = (loan.amount * monthlyRate * 
        (Math.floor((new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24 * 30))));
      remainingAmount = loan.amount + accumulatedInterest - totalPaid - totalPrepaid;
    }

    // Update loan status if fully paid
    if (remainingAmount <= 0) {
      loan.status = 'paid';
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update prepayment
router.put('/:id/prepayment/:prepaymentId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }

    const loan = await Loan.findOneAndUpdate(
      { 
        _id: req.params.id,
        'prepayments._id': req.params.prepaymentId 
      },
      { 
        $set: { 
          'prepayments.$.amount': Number(req.body.amount),
          'prepayments.$.date': new Date(req.body.date)
        } 
      },
      { new: true }
    );

    if (!loan) {
      return res.status(404).json({ message: 'Loan or prepayment not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('Error updating prepayment:', error);
    res.status(400).json({ message: error.message || 'Error updating prepayment' });
  }
});

// Delete prepayment
router.delete('/:id/prepayment/:prepaymentId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Find and remove the prepayment
    const prepaymentIndex = loan.prepayments.findIndex(p => p._id.toString() === req.params.prepaymentId);
    if (prepaymentIndex === -1) {
      return res.status(404).json({ message: 'Prepayment not found' });
    }

    loan.prepayments.splice(prepaymentIndex, 1);
    await loan.save();
    res.json({ message: 'Prepayment deleted' });
  } catch (error) {
    console.error('Error deleting prepayment:', error);
    res.status(500).json({ message: error.message || 'Error deleting prepayment' });
  }
});

// Add spent transaction
router.post('/:id/spent', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    if (loan.loanType !== 'creditCard') {
      return res.status(400).json({ message: 'Spent transactions are only allowed for credit cards' });
    }
    
    const { amount, date, description } = req.body;
    loan.spentHistory.push({ amount, date, description });
    loan.outstanding = (loan.outstanding || 0) + Number(amount);
    
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update spent transaction
router.put('/:id/spent/:spentId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const spentIndex = loan.spentHistory.findIndex(s => s._id.toString() === req.params.spentId);
    if (spentIndex === -1) {
      return res.status(404).json({ message: 'Spent transaction not found' });
    }

    const oldAmount = loan.spentHistory[spentIndex].amount;
    const newAmount = Number(req.body.amount);
    
    loan.spentHistory[spentIndex] = {
      ...loan.spentHistory[spentIndex],
      amount: newAmount,
      date: req.body.date,
      description: req.body.description
    };

    // Adjust the outstanding amount
    loan.outstanding = (loan.outstanding || 0) - oldAmount + newAmount;
    
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete spent transaction
router.delete('/:id/spent/:spentId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid loan ID format' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const spentIndex = loan.spentHistory.findIndex(s => s._id.toString() === req.params.spentId);
    if (spentIndex === -1) {
      return res.status(404).json({ message: 'Spent transaction not found' });
    }

    // Adjust the outstanding amount before removing the transaction
    loan.outstanding = (loan.outstanding || 0) - loan.spentHistory[spentIndex].amount;
    
    loan.spentHistory.splice(spentIndex, 1);
    await loan.save();
    res.json({ message: 'Spent transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 