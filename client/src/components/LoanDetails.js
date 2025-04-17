import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PercentIcon from '@mui/icons-material/Percent';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function LoanDetails({ onBack }) {
  const { id } = useParams(); // Get the loan ID from URL params
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emiBreakdown, setEmiBreakdown] = useState([]);
  const [prepaymentDialogOpen, setPrepaymentDialogOpen] = useState(false);
  const [prepaymentData, setPrepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [editPrepaymentDialogOpen, setEditPrepaymentDialogOpen] = useState(false);
  const [editPrepaymentData, setEditPrepaymentData] = useState({
    id: '',
    amount: '',
    date: '',
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [spentDialogOpen, setSpentDialogOpen] = useState(false);
  const [spentData, setSpentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState({
    id: '',
    amount: '',
    date: '',
  });
  const [editSpentDialogOpen, setEditSpentDialogOpen] = useState(false);
  const [editSpentData, setEditSpentData] = useState({
    id: '',
    amount: '',
    date: '',
    description: '',
  });

  const fetchLoanDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/loans/${id}`);
      setLoan(response.data);
      if (response.data.loanType === 'personal') {
        calculateEMIBreakdown(response.data);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching loan details:', error);
      setError(error.response?.data?.message || 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLoanDetails();
    }
  }, [fetchLoanDetails, id]);

  const calculateEMIBreakdown = (loanData) => {
    if (!loanData) return;

    const { amount, interestRate, term, startDate, prepayments = [] } = loanData;
    const monthlyRate = interestRate / 100 / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    
    let remainingPrincipal = amount;
    const breakdown = [];

    // Sort prepayments by date
    const sortedPrepayments = [...prepayments].sort((a, b) => new Date(a.date) - new Date(b.date));
    let prepaymentIndex = 0;

    for (let i = 1; i <= term; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + i - 1);

      // Check if there's a prepayment for this month
      let prepaymentAmount = 0;
      while (prepaymentIndex < sortedPrepayments.length) {
        const prepaymentDate = new Date(sortedPrepayments[prepaymentIndex].date);
        if (prepaymentDate.getMonth() === currentDate.getMonth() && 
            prepaymentDate.getFullYear() === currentDate.getFullYear()) {
          prepaymentAmount += sortedPrepayments[prepaymentIndex].amount;
          prepaymentIndex++;
        } else {
          break;
        }
      }

      // If remaining principal is 0, skip this month
      if (remainingPrincipal <= 0) {
        break;
      }

      const interest = remainingPrincipal * monthlyRate;
      
      // Calculate the actual EMI for this month
      let actualEMI;
      let principal;
      
      if (remainingPrincipal + interest <= emi) {
        // If remaining amount + interest is less than regular EMI, use that as the EMI
        actualEMI = remainingPrincipal + interest;
        principal = remainingPrincipal;
        remainingPrincipal = 0;
      } else {
        // Use regular EMI calculation
        actualEMI = emi;
        principal = emi - interest;
        remainingPrincipal = Math.max(0, remainingPrincipal - principal - prepaymentAmount);
      }

      breakdown.push({
        month: i,
        emi: actualEMI,
        principal: principal,
        interest: interest,
        prepayment: prepaymentAmount,
        remainingPrincipal: remainingPrincipal,
        date: currentDate,
      });

      // If loan is fully paid, break the loop
      if (remainingPrincipal <= 0) {
        break;
      }
    }

    setEmiBreakdown(breakdown);
  };

  const calculateInterestSummary = (loanData, emiBreakdown) => {
    if (!loanData || !emiBreakdown) return { totalInterest: 0, interestSaved: 0 };

    // Calculate total interest for the entire loan
    const monthlyRate = loanData.interestRate / 100 / 12;
    const emi = (loanData.amount * monthlyRate * Math.pow(1 + monthlyRate, loanData.term)) / 
                (Math.pow(1 + monthlyRate, loanData.term) - 1);
    const totalInterestForLoan = (emi * loanData.term) - loanData.amount;

    // Calculate actual interest paid with prepayments
    const totalInterestPaid = emiBreakdown.reduce((sum, month) => sum + month.interest, 0);
    const interestSaved = totalInterestForLoan - totalInterestPaid;

    return {
      totalInterest: totalInterestForLoan,
      interestSaved: interestSaved
    };
  };

  const handlePrepaymentOpen = () => {
    setPrepaymentDialogOpen(true);
  };

  const handlePrepaymentClose = () => {
    setPrepaymentDialogOpen(false);
    setPrepaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePrepaymentSubmit = async () => {
    try {
      if (!prepaymentData.amount || !prepaymentData.date) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(prepaymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await axios.post(`${API_URL}/loans/${id}/prepayment`, {
        amount: amount,
        date: prepaymentData.date
      });

      if (response.data) {
        await fetchLoanDetails();
        setPrepaymentDialogOpen(false);
        setPrepaymentData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error processing prepayment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to process prepayment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleEditPrepaymentOpen = (prepayment) => {
    setEditPrepaymentData({
      id: prepayment._id,
      amount: prepayment.amount.toString(),
      date: prepayment.date.split('T')[0],
    });
    setEditPrepaymentDialogOpen(true);
  };

  const handleEditPrepaymentClose = () => {
    setEditPrepaymentDialogOpen(false);
    setEditPrepaymentData({
      id: '',
      amount: '',
      date: '',
    });
  };

  const handleEditPrepaymentSubmit = async () => {
    try {
      if (!editPrepaymentData.amount || !editPrepaymentData.date) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(editPrepaymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      await axios.put(`${API_URL}/loans/${id}/prepayment/${editPrepaymentData.id}`, {
        amount: amount,
        date: editPrepaymentData.date
      });

      await fetchLoanDetails();
      setEditPrepaymentDialogOpen(false);
      setEditPrepaymentData({
        id: '',
        amount: '',
        date: '',
      });
      setError(null);
    } catch (error) {
      console.error('Error updating prepayment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to update prepayment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleDeletePrepayment = async (prepaymentId) => {
    try {
      await axios.delete(`${API_URL}/loans/${id}/prepayment/${prepaymentId}`);
      await fetchLoanDetails();
      setError(null);
    } catch (error) {
      console.error('Error deleting prepayment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to delete prepayment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const calculateGoldLoanBreakdown = () => {
    if (!loan) return [];
    const monthlyRate = loan.interestRate / 100 / 12;
    let outstanding = loan.amount;
    let accumulatedInterest = 0;
    const breakdown = [];
    const prepayments = [...(loan.prepayments || [])].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const startDate = new Date(loan.startDate);
    const currentDate = new Date();
    
    // Calculate months difference including current month
    const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - startDate.getMonth()) + 1;

    for (let month = 1; month <= monthsDiff; month++) {
      const currentMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + month - 1, 1);
      const isCurrentMonth = currentMonthDate.getMonth() === currentDate.getMonth() && 
                           currentMonthDate.getFullYear() === currentDate.getFullYear();

      // Calculate monthly interest
      const interest = outstanding * monthlyRate;
      accumulatedInterest += interest;

      // Initialize prepayment variables
      let prepayment = 0;
      let prepaymentFromInterest = 0;
      let prepaymentFromPrincipal = 0;

      // Check if there's a prepayment for this month
      const prepaymentIndex = prepayments.findIndex(p => {
        const prepaymentDate = new Date(p.date);
        return prepaymentDate.getMonth() === currentMonthDate.getMonth() &&
               prepaymentDate.getFullYear() === currentMonthDate.getFullYear();
      });

      if (prepaymentIndex !== -1) {
        prepayment = prepayments[prepaymentIndex].amount;
        
        // First deduct from accumulated interest
        if (accumulatedInterest > 0) {
          if (prepayment <= accumulatedInterest) {
            prepaymentFromInterest = prepayment;
            accumulatedInterest -= prepayment;
          } else {
            prepaymentFromInterest = accumulatedInterest;
            prepaymentFromPrincipal = prepayment - accumulatedInterest;
            accumulatedInterest = 0;
            outstanding -= prepaymentFromPrincipal;
          }
        } else {
          // If no accumulated interest, deduct from principal
          prepaymentFromPrincipal = prepayment;
          outstanding -= prepaymentFromPrincipal;
        }
        
        prepayments.splice(prepaymentIndex, 1);
      }

      // Add to breakdown
      breakdown.push({
        month,
        date: currentMonthDate,
        interest,
        accumulatedInterest,
        prepayment,
        prepaymentFromInterest,
        prepaymentFromPrincipal,
        outstanding,
        totalOutstanding: outstanding + accumulatedInterest,
        isCurrentMonth
      });
    }

    return breakdown;
  };

  const handlePaymentDialogOpen = () => {
    setPaymentDialogOpen(true);
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setPaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePaymentSubmit = async () => {
    try {
      if (!paymentData.amount || !paymentData.date) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(paymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await axios.post(`${API_URL}/loans/${id}/payment`, {
        amount: amount,
        date: paymentData.date
      });

      if (response.data) {
        await fetchLoanDetails();
        setPaymentDialogOpen(false);
        setPaymentData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to process payment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleSpentDialogOpen = () => {
    setSpentDialogOpen(true);
    setSpentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  const handleSpentDialogClose = () => {
    setSpentDialogOpen(false);
    setSpentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setError(null);
  };

  const handleSpentSubmit = async () => {
    try {
      if (!spentData.amount || !spentData.date || !spentData.description) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(spentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await axios.post(`${API_URL}/loans/${id}/spent`, {
        amount: amount,
        date: spentData.date,
        description: spentData.description
      });

      if (response.data) {
        await fetchLoanDetails();
        setSpentDialogOpen(false);
        setSpentData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error processing spent:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to process spent amount');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleEditPaymentOpen = (payment) => {
    if (!payment || !payment._id) {
      setError('Invalid payment data');
      return;
    }
    setEditPaymentData({
      id: payment._id,
      amount: payment.payment?.toString() || '0',
      date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setEditPaymentDialogOpen(true);
  };

  const handleEditPaymentClose = () => {
    setEditPaymentDialogOpen(false);
    setEditPaymentData({
      id: '',
      amount: '',
      date: '',
    });
  };

  const handleEditPaymentSubmit = async () => {
    try {
      if (!editPaymentData.amount || !editPaymentData.date) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(editPaymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await axios.put(`${API_URL}/loans/${id}/payment/${editPaymentData.id}`, {
        amount: amount,
        date: editPaymentData.date
      });

      if (response.data) {
        await fetchLoanDetails();
        setEditPaymentDialogOpen(false);
        setEditPaymentData({
          id: '',
          amount: '',
          date: '',
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to update payment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await axios.delete(`${API_URL}/loans/${id}/payment/${paymentId}`);
      await fetchLoanDetails();
      setError(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to delete payment');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleEditSpentOpen = (spent) => {
    if (!spent || !spent._id) {
      setError('Invalid spent data');
      return;
    }
    setEditSpentData({
      id: spent._id,
      amount: spent.spent?.toString() || '0',
      date: spent.date ? new Date(spent.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: spent.description || ''
    });
    setEditSpentDialogOpen(true);
  };

  const handleEditSpentClose = () => {
    setEditSpentDialogOpen(false);
    setEditSpentData({
      id: '',
      amount: '',
      date: '',
      description: ''
    });
  };

  const handleEditSpentSubmit = async () => {
    try {
      if (!editSpentData.amount || !editSpentData.date || !editSpentData.description) {
        setError('Please fill in all fields');
        return;
      }

      const amount = Number(editSpentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await axios.put(`${API_URL}/loans/${id}/spent/${editSpentData.id}`, {
        amount: amount,
        date: editSpentData.date,
        description: editSpentData.description
      });

      if (response.data) {
        await fetchLoanDetails();
        setEditSpentDialogOpen(false);
        setEditSpentData({
          id: '',
          amount: '',
          date: '',
          description: ''
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error updating spent:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to update spent amount');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const handleDeleteSpent = async (spentId) => {
    try {
      await axios.delete(`${API_URL}/loans/${id}/spent/${spentId}`);
      await fetchLoanDetails();
      setError(null);
    } catch (error) {
      console.error('Error deleting spent:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to delete spent amount');
      } else {
        setError('Failed to connect to server');
      }
    }
  };

  const renderCreditCardDetails = () => {
    if (!loan) return null;

    // Combine spent history and payments into transactions
    const transactions = [
      ...(loan.spentHistory || []).map(spent => ({
        _id: spent._id,
        date: new Date(spent.date),
        description: spent.description || '',
        spent: Number(spent.amount) || 0,
        payment: 0,
        type: 'spent',
        originalData: spent
      })),
      ...(loan.payments || []).map(payment => ({
        _id: payment._id,
        date: new Date(payment.date),
        description: 'Payment',
        spent: 0,
        payment: Number(payment.amount) || 0,
        type: 'payment',
        originalData: payment
      }))
    ].sort((a, b) => b.date - a.date); // Sort by date, newest first

    // Calculate running balance
    let balance = Number(loan.outstanding) || 0;  // Ensure it's a number
    transactions.reverse().forEach(transaction => {
      const spent = Number(transaction.spent) || 0;
      const payment = Number(transaction.payment) || 0;
      transaction.outstanding = balance + spent - payment;
      balance = transaction.outstanding;
    });
    transactions.reverse();

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Credit Card Details
          </Typography>
          <Box sx={{ ml: { xs: 0, sm: 'auto' }, display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              onClick={handlePaymentDialogOpen}
              fullWidth={true}
              sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}
            >
              Make Payment
            </Button>
            <Button
              variant="contained"
              startIcon={<AttachMoneyIcon />}
              onClick={handleSpentDialogOpen}
              fullWidth={true}
              sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}
            >
              Add Spent
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Card Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Borrower Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {loan.borrowerName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Status
                </Typography>
                <Chip
                  label={loan.status}
                  color={getStatusColor(loan.status)}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Start Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Card Terms
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(37, 99, 235, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <AttachMoneyIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Outstanding
                      </Typography>
                      <Typography variant="h6">
                        ₹{loan.outstanding?.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Transaction History
              </Typography>
              <Divider sx={{ my: 2 }} />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Spent Amount</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Payment</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction, index) => (
                      <TableRow 
                        key={index}
                        sx={{
                          bgcolor: transaction.type === 'payment' ? 'rgba(16, 185, 129, 0.05)' : 'inherit'
                        }}
                      >
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Box>
                            {transaction.description || 'N/A'}
                            <Typography 
                              variant="caption" 
                              display="block"
                              sx={{ 
                                display: { xs: 'block', sm: 'none' },
                                color: 'text.secondary'
                              }}
                            >
                              {format(new Date(transaction.date), 'MMM dd, yyyy')}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              display="block" 
                              sx={{ 
                                display: { xs: 'block', md: 'none' },
                                color: transaction.spent > 0 ? 'error.main' : 'success.main'
                              }}
                            >
                              {transaction.spent > 0 
                                ? `Spent: ₹${transaction.spent.toFixed(2)}` 
                                : transaction.payment > 0 
                                  ? `Paid: ₹${transaction.payment.toFixed(2)}` 
                                  : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'error.main' }}>
                          {transaction.spent > 0 ? `₹${transaction.spent.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'success.main' }}>
                          {transaction.payment > 0 ? `₹${transaction.payment.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          ₹{transaction.outstanding.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  try {
                                    if (transaction.type === 'payment') {
                                      handleEditPaymentOpen({
                                        _id: transaction._id,
                                        payment: transaction.payment,
                                        date: transaction.date
                                      });
                                    } else {
                                      handleEditSpentOpen({
                                        _id: transaction._id,
                                        spent: transaction.spent,
                                        date: transaction.date,
                                        description: transaction.description
                                      });
                                    }
                                  } catch (err) {
                                    console.error('Error opening edit dialog:', err);
                                    setError('Failed to open edit dialog');
                                  }
                                }}
                                sx={{ color: 'primary.main' }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  try {
                                    if (transaction.type === 'payment') {
                                      if (transaction._id) {
                                        handleDeletePayment(transaction._id);
                                      } else {
                                        setError('Invalid payment ID');
                                      }
                                    } else {
                                      if (transaction._id) {
                                        handleDeleteSpent(transaction._id);
                                      } else {
                                        setError('Invalid spent ID');
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error deleting transaction:', err);
                                    setError('Failed to delete transaction');
                                  }
                                }}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Dialogs - Make them more mobile friendly */}
        <Dialog 
          open={paymentDialogOpen} 
          onClose={handlePaymentDialogClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Make Payment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, width: '100%' }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                margin="normal"
                required
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={handlePaymentDialogClose}
              fullWidth
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentSubmit} 
              variant="contained"
              fullWidth
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Spent Dialog - Make it more mobile friendly */}
        <Dialog 
          open={spentDialogOpen} 
          onClose={handleSpentDialogClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Add Spent Amount</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, width: '100%' }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={spentData.amount}
                onChange={(e) => setSpentData({ ...spentData, amount: e.target.value })}
                margin="normal"
                required
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                fullWidth
                label="Description"
                value={spentData.description}
                onChange={(e) => setSpentData({ ...spentData, description: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={spentData.date}
                onChange={(e) => setSpentData({ ...spentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={handleSpentDialogClose}
              fullWidth
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSpentSubmit} 
              variant="contained"
              fullWidth
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Edit Payment Dialog */}
        <Dialog 
          open={editPaymentDialogOpen} 
          onClose={handleEditPaymentClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, width: '100%' }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editPaymentData.amount}
                onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                margin="normal"
                required
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={editPaymentData.date}
                onChange={(e) => setEditPaymentData({ ...editPaymentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={handleEditPaymentClose}
              fullWidth
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditPaymentSubmit} 
              variant="contained"
              fullWidth
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Edit Spent Dialog */}
        <Dialog 
          open={editSpentDialogOpen} 
          onClose={handleEditSpentClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Spent Amount</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, width: '100%' }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editSpentData.amount}
                onChange={(e) => setEditSpentData({ ...editSpentData, amount: e.target.value })}
                margin="normal"
                required
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                fullWidth
                label="Description"
                value={editSpentData.description}
                onChange={(e) => setEditSpentData({ ...editSpentData, description: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={editSpentData.date}
                onChange={(e) => setEditSpentData({ ...editSpentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={handleEditSpentClose}
              fullWidth
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSpentSubmit} 
              variant="contained"
              fullWidth
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const renderLoanDetails = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Loan Details
          </Typography>
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={handlePrepaymentOpen}
            sx={{ ml: 'auto' }}
          >
            Make Prepayment
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Loan Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Borrower Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {loan.borrowerName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Status
                </Typography>
                <Chip
                  label={loan.status}
                  color={getStatusColor(loan.status)}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{ flex: 1 }}>
                  Start Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              {loan.prepayments && loan.prepayments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Prepayments
                  </Typography>
                  {loan.prepayments.map((prepayment) => (
                    <Box 
                      key={prepayment._id} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(16, 185, 129, 0.05)',
                        '&:hover': {
                          bgcolor: 'rgba(16, 185, 129, 0.08)'
                        }
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {format(new Date(prepayment.date), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                          ₹{prepayment.amount.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit Prepayment">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditPrepaymentOpen(prepayment)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Prepayment">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeletePrepayment(prepayment._id)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Loan Terms
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(37, 99, 235, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <AttachMoneyIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Loan Amount
                      </Typography>
                      <Typography variant="h6">
                        ₹{loan.amount.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(37, 99, 235, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <PercentIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Interest Rate
                      </Typography>
                      <Typography variant="h6">
                        {loan.interestRate}% per annum
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(37, 99, 235, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <ScheduleIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Start Date
                      </Typography>
                      <Typography variant="h6">
                        {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {loan.loanType === 'personal' && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  EMI Schedule
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">EMI Amount</TableCell>
                        <TableCell align="right">Principal</TableCell>
                        <TableCell align="right">Interest</TableCell>
                        <TableCell align="right">Prepayment</TableCell>
                        <TableCell align="right">Outstanding</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emiBreakdown.map((row) => (
                        <TableRow 
                          key={row.month}
                          sx={{
                            bgcolor: row.prepayment > 0 ? 'rgba(16, 185, 129, 0.05)' : 'inherit'
                          }}
                        >
                          <TableCell>{format(row.date, 'MMM yyyy')}</TableCell>
                          <TableCell align="right">₹{row.emi.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{row.principal.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{row.interest.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {row.prepayment > 0 ? `₹${row.prepayment.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right">₹{row.remainingPrincipal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {loan.loanType === 'gold' && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Gold Loan Breakdown
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Interest</TableCell>
                        <TableCell align="right">Accumulated Interest</TableCell>
                        <TableCell align="right">Prepayment</TableCell>
                        <TableCell align="right">From Interest</TableCell>
                        <TableCell align="right">From Principal</TableCell>
                        <TableCell align="right">Outstanding</TableCell>
                        <TableCell align="right">Total Outstanding</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculateGoldLoanBreakdown().map((row, index) => (
                        <TableRow 
                          key={index}
                          sx={{
                            bgcolor: row.isCurrentMonth ? 'rgba(180, 83, 9, 0.05)' : 'inherit',
                            '&:hover': {
                              bgcolor: row.isCurrentMonth ? 'rgba(180, 83, 9, 0.1)' : 'grey.50'
                            }
                          }}
                        >
                          <TableCell>
                            {format(row.date, 'MMM yyyy')}
                            {row.isCurrentMonth && (
                              <Chip 
                                label="Current Month" 
                                size="small" 
                                sx={{ ml: 1, bgcolor: 'rgba(180, 83, 9, 0.1)', color: '#b45309' }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">₹{row.interest.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{row.accumulatedInterest.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {row.prepayment > 0 ? `₹${row.prepayment.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {row.prepaymentFromInterest > 0 ? `₹${row.prepaymentFromInterest.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {row.prepaymentFromPrincipal > 0 ? `₹${row.prepaymentFromPrincipal.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right">₹{row.outstanding.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{row.totalOutstanding.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Prepayment Dialog */}
        <Dialog open={prepaymentDialogOpen} onClose={handlePrepaymentClose}>
          <DialogTitle>Make Prepayment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={prepaymentData.amount}
                onChange={(e) => setPrepaymentData({ ...prepaymentData, amount: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={prepaymentData.date}
                onChange={(e) => setPrepaymentData({ ...prepaymentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePrepaymentClose}>Cancel</Button>
            <Button onClick={handlePrepaymentSubmit} variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Prepayment Dialog */}
        <Dialog open={editPrepaymentDialogOpen} onClose={handleEditPrepaymentClose}>
          <DialogTitle>Edit Prepayment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editPrepaymentData.amount}
                onChange={(e) => setEditPrepaymentData({ ...editPrepaymentData, amount: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={editPrepaymentData.date}
                onChange={(e) => setEditPrepaymentData({ ...editPrepaymentData, date: e.target.value })}
                margin="normal"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditPrepaymentClose}>Cancel</Button>
            <Button onClick={handleEditPrepaymentSubmit} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to List
        </Button>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!loan) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to List
        </Button>
        <Typography>Loan not found</Typography>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paid':
        return 'primary';
      case 'defaulted':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
      >
        Back to List
      </Button>
      {loan?.loanType === 'creditCard' ? renderCreditCardDetails() : renderLoanDetails()}
    </Box>
  );
}

export default LoanDetails; 