const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/loan-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

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

// Routes
app.get('/api/loans', async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/loans/:id', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/loans', async (req, res) => {
  try {
    const { 
      borrowerName, 
      amount, 
      interestRate, 
      term, 
      startDate, 
      loanType,
      creditLimit,
      cardNumber,
      status,
      outstanding
    } = req.body;

    // Validate required fields based on loan type
    if (loanType === 'creditCard') {
      if (!borrowerName || !amount || !startDate || !cardNumber) {
        return res.status(400).json({ error: 'Missing required fields for credit card' });
      }
    } else {
      if (!borrowerName || !amount || !interestRate || !startDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (loanType === 'personal' && !term) {
        return res.status(400).json({ error: 'Term is required for personal loans' });
      }
    }

    const loan = new Loan({
      borrowerName,
      amount,
      interestRate: loanType === 'creditCard' ? 0 : interestRate,
      term: loanType === 'creditCard' ? null : term,
      startDate,
      loanType,
      creditLimit: loanType === 'creditCard' ? amount : null,
      cardNumber: loanType === 'creditCard' ? cardNumber : null,
      status: 'active',
      outstanding: amount
    });

    await loan.save();
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Error creating loan' });
  }
});

app.put('/api/loans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { borrowerName, amount, interestRate, term, startDate, loanType } = req.body;

    // Validate required fields
    if (!borrowerName || !amount || !interestRate || !startDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // For personal loans, term is required
    if (loanType === 'personal' && !term) {
      return res.status(400).json({ message: 'Term is required for personal loans' });
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Update loan details
    loan.borrowerName = borrowerName;
    loan.amount = amount;
    loan.interestRate = interestRate;
    loan.startDate = startDate;
    
    if (loanType === 'personal') {
      loan.term = term;
    }

    // Save the updated loan
    await loan.save();

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ message: 'Error updating loan' });
  }
});

app.delete('/api/loans/:id', async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Loan deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new route for prepayments
app.post('/api/loans/:id/prepayment', async (req, res) => {
  try {
    const { amount, date } = req.body;
    const loanId = req.params.id;
    
    // Validate loan ID
    if (!loanId || loanId === 'null') {
      return res.status(400).json({ message: 'Invalid loan ID' });
    }

    // Validate input
    if (!amount || !date) {
      return res.status(400).json({ message: 'Amount and date are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const loan = await Loan.findById(loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status === 'paid') {
      return res.status(400).json({ message: 'Cannot make prepayment on a paid loan' });
    }

    // Add the prepayment to the loan
    loan.prepayments.push({
      amount: Number(amount),
      date: new Date(date)
    });

    // Calculate total paid including prepayments
    const totalPaid = loan.prepayments.reduce((sum, prepayment) => sum + prepayment.amount, 0);
    
    // Update the loan status if fully paid
    if (totalPaid >= loan.amount) {
      loan.status = 'paid';
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error processing prepayment:', error);
    res.status(500).json({ message: 'Error processing prepayment' });
  }
});

// Update prepayment
app.put('/api/loans/:loanId/prepayment/:prepaymentId', async (req, res) => {
  try {
    const { amount, date } = req.body;
    
    // Validate input
    if (!amount || !date) {
      return res.status(400).json({ message: 'Amount and date are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const loan = await Loan.findById(req.params.loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Find the prepayment by ID
    const prepaymentIndex = loan.prepayments.findIndex(p => p._id.toString() === req.params.prepaymentId);
    if (prepaymentIndex === -1) {
      return res.status(404).json({ message: 'Prepayment not found' });
    }

    // Update the prepayment
    loan.prepayments[prepaymentIndex] = {
      ...loan.prepayments[prepaymentIndex],
      amount: Number(amount),
      date: new Date(date)
    };

    // Calculate total paid including prepayments
    const totalPaid = loan.prepayments.reduce((sum, prepayment) => sum + prepayment.amount, 0);
    
    // Update the loan status if fully paid
    if (totalPaid >= loan.amount) {
      loan.status = 'paid';
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error updating prepayment:', error);
    res.status(500).json({ message: 'Error updating prepayment' });
  }
});

// Delete prepayment
app.delete('/api/loans/:loanId/prepayment/:prepaymentId', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Find the prepayment by ID
    const prepaymentIndex = loan.prepayments.findIndex(p => p._id.toString() === req.params.prepaymentId);
    if (prepaymentIndex === -1) {
      return res.status(404).json({ message: 'Prepayment not found' });
    }

    // Remove the prepayment
    loan.prepayments.splice(prepaymentIndex, 1);

    // Calculate total paid including prepayments
    const totalPaid = loan.prepayments.reduce((sum, prepayment) => sum + prepayment.amount, 0);
    
    // Update the loan status
    if (totalPaid >= loan.amount) {
      loan.status = 'paid';
    } else {
      loan.status = 'active';
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error deleting prepayment:', error);
    res.status(500).json({ message: 'Error deleting prepayment' });
  }
});

// Add spent amount route for credit cards
app.post('/api/loans/:id/spent', async (req, res) => {
  try {
    const { amount, date, description } = req.body;
    
    // Validate input
    if (!amount || !date || !description) {
      return res.status(400).json({ error: 'Amount, date, and description are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.loanType !== 'creditCard') {
      return res.status(400).json({ error: 'This operation is only valid for credit cards' });
    }

    // Add the spent amount to the outstanding balance
    loan.outstanding = (loan.outstanding || loan.creditLimit) + Number(amount);

    // Add the spent record
    if (!loan.spentHistory) {
      loan.spentHistory = [];
    }
    
    loan.spentHistory.push({
      amount: Number(amount),
      date: new Date(date),
      description
    });

    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error processing spent amount:', error);
    res.status(500).json({ error: 'Error processing spent amount' });
  }
});

// Add payment route
app.post('/api/loans/:id/payment', async (req, res) => {
  try {
    const { amount, date } = req.body;
    
    // Validate input
    if (!amount || !date) {
      return res.status(400).json({ error: 'Amount and date are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Add the payment to the payments array
    loan.payments.push({
      amount: Number(amount),
      date: new Date(date),
      status: 'completed'
    });

    // Update the outstanding amount
    loan.outstanding = Math.max(0, loan.outstanding - Number(amount));

    // Update loan status if fully paid
    if (loan.outstanding === 0) {
      loan.status = 'paid';
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Error processing payment' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 