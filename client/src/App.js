import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Snackbar,
  Alert,
  DialogContentText,
  Tabs,
  Tab,
  CircularProgress,
  Container
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoanDetails from './components/LoanDetails';
import PersonalLoanOutstandings from './components/PersonalLoanOutstandings';
import GoldLoanOutstandings from './components/GoldLoanOutstandings';
import ErrorBoundary from './components/ErrorBoundary';
import { loans } from './utils/api';
import { makeStyles } from '@mui/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
  },
  appBar: {
    backgroundColor: '#1976d2',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      padding: theme.spacing(1),
    },
  },
  title: {
    flexGrow: 1,
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
      marginBottom: theme.spacing(1),
    },
  },
  tabContainer: {
    [theme.breakpoints.down('sm')]: {
      width: '100%',
    },
  },
  tab: {
    [theme.breakpoints.down('sm')]: {
      minWidth: 'auto',
      padding: theme.spacing(1),
      fontSize: '0.8rem',
    },
  },
  addButton: {
    marginLeft: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      marginLeft: 0,
      marginTop: theme.spacing(1),
      padding: theme.spacing(1),
      fontSize: '0.8rem',
    },
  },
  card: {
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
    },
  },
  cardContent: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  cardActions: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
      '& button': {
        padding: theme.spacing(0.5),
        fontSize: '0.75rem',
        minWidth: 'auto',
      },
    },
  },
  dialogContent: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  dialogActions: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
      '& button': {
        padding: theme.spacing(0.5),
        fontSize: '0.75rem',
        minWidth: 'auto',
      },
    },
  },
  formControl: {
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(1),
    },
  },
  textField: {
    [theme.breakpoints.down('sm')]: {
      '& .MuiInputBase-root': {
        fontSize: '0.875rem',
      },
    },
  },
  button: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(0.5),
      fontSize: '0.75rem',
      minWidth: 'auto',
    },
  },
}));

function App() {
  const classes = useStyles();
  const [allLoans, setAllLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [prepaymentOpen, setPrepaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedPaymentLoan, setSelectedPaymentLoan] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoanData, setEditLoanData] = useState({
    borrowerName: '',
    amount: '',
    interestRate: '',
    term: '',
    startDate: '',
    _id: null
  });
  const [formData, setFormData] = useState({
    borrowerName: '',
    amount: '',
    interestRate: '',
    term: '',
    startDate: '',
    loanType: 'personal',
    creditLimit: '',
    cardNumber: ''
  });
  const [prepaymentData, setPrepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteLoan, setDeleteLoan] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personalLoans, setPersonalLoans] = useState([]);
  const [goldLoans, setGoldLoans] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [spentDialogOpen, setSpentDialogOpen] = useState(false);
  const [spentData, setSpentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(0);

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/personal-loans')) {
      setValue(0);
    } else if (path.includes('/gold-loans')) {
      setValue(1);
    } else if (path.includes('/credit-cards')) {
      setValue(2);
    }
  }, [location.pathname]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await loans.getAll();
      setAllLoans(response.data);
      setPersonalLoans(response.data.filter(loan => !loan.loanType || loan.loanType === 'personal'));
      setGoldLoans(response.data.filter(loan => loan.loanType === 'gold'));
      setCreditCards(response.data.filter(loan => loan.loanType === 'creditCard'));
    } catch (error) {
      console.error('Error fetching loans:', error);
      setError(error.message);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      borrowerName: '',
      amount: '',
      interestRate: '',
      term: '',
      startDate: '',
      loanType: 'personal',
      creditLimit: '',
      cardNumber: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.borrowerName || !formData.amount || !formData.startDate) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        return;
      }

      let submitData;

      if (formData.loanType === 'creditCard') {
        if (!formData.cardNumber) {
          setSnackbar({
            open: true,
            message: 'Card number is required for credit cards',
            severity: 'error'
          });
          return;
        }

        submitData = {
          borrowerName: formData.borrowerName,
          amount: Number(formData.amount),
          creditLimit: Number(formData.amount),
          cardNumber: formData.cardNumber,
          startDate: formData.startDate,
          loanType: 'creditCard',
          interestRate: 0,
          status: 'active',
          outstanding: Number(formData.amount)
        };
      } else {
        if (!formData.interestRate) {
          setSnackbar({
            open: true,
            message: 'Interest rate is required',
            severity: 'error'
          });
          return;
        }

        submitData = {
          borrowerName: formData.borrowerName,
          amount: Number(formData.amount),
          interestRate: Number(formData.interestRate),
          startDate: formData.startDate,
          loanType: formData.loanType,
          status: 'active',
          outstanding: Number(formData.amount)
        };

        if (formData.loanType === 'personal') {
          if (!formData.term) {
            setSnackbar({
              open: true,
              message: 'Term is required for personal loans',
              severity: 'error'
            });
            return;
          }
          submitData.term = Number(formData.term);
        }
      }

      const response = await loans.create(submitData);
      
      if (response.data) {
        setSnackbar({
          open: true,
          message: `${formData.loanType === 'creditCard' ? 'Credit Card' : 
                   formData.loanType === 'gold' ? 'Gold Loan' : 'Personal Loan'} added successfully`,
          severity: 'success'
        });
        fetchLoans();
        handleClose();
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleViewDetails = (loanId) => {
    navigate(`/loans/${loanId}`);
  };

  const handleBackToList = () => {
    setSelectedLoan(null);
  };

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

  const handlePrepaymentClose = () => {
    setPrepaymentOpen(false);
    setSelectedLoan(null);
    setPrepaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePrepaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedLoan) {
        setSnackbar({
          open: true,
          message: 'No loan selected for prepayment',
          severity: 'error'
        });
        return;
      }

      if (!prepaymentData.amount || !prepaymentData.date) {
        setSnackbar({
          open: true,
          message: 'Please fill in all fields',
          severity: 'error'
        });
        return;
      }

      const amount = Number(prepaymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be a positive number',
          severity: 'error'
        });
        return;
      }

      const response = await loans.addPrepayment(selectedLoan, {
        amount: amount,
        date: prepaymentData.date
      });
      
      if (response.data) {
        setSnackbar({
          open: true,
          message: 'Prepayment added successfully',
          severity: 'success'
        });
        fetchLoans();
        handlePrepaymentClose();
      }
    } catch (error) {
      console.error('Error processing prepayment:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  // Add this helper function for EMI calculation
  const calculateEMI = (amount, interestRate, term) => {
    const monthlyRate = interestRate / 100 / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                (Math.pow(1 + monthlyRate, term) - 1);
    return Math.round(emi);
  };

  // Modify Dialog content for different loan types
  const renderDialogContent = () => {
    return (
      <>
        <TextField
          fullWidth
          label={formData.loanType === 'creditCard' ? "Credit Card Name" : "Borrower Name"}
          name="borrowerName"
          value={formData.borrowerName}
          onChange={handleInputChange}
          margin="normal"
          required
        />
        {formData.loanType === 'creditCard' ? (
          <>
            <TextField
              fullWidth
              label="Credit Limit"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Card Number"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleInputChange}
              margin="normal"
              required
              placeholder="Enter 16-digit card number"
              inputProps={{ maxLength: 16 }}
            />
          </>
        ) : (
          <>
            <TextField
              fullWidth
              label="Loan Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Interest Rate (%)"
              name="interestRate"
              type="number"
              value={formData.interestRate}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            {formData.loanType === 'personal' && (
              <TextField
                fullWidth
                label="Term (months)"
                name="term"
                type="number"
                value={formData.term}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            )}
          </>
        )}
        <TextField
          fullWidth
          label="Start Date"
          name="startDate"
          type="date"
          value={formData.startDate}
          onChange={handleInputChange}
          margin="normal"
          required
          InputLabelProps={{
            shrink: true,
          }}
        />
      </>
    );
  };

  // Add handler for edit button click
  const handleEditOpen = (loan) => {
    setEditLoanData({
      borrowerName: loan.borrowerName,
      amount: loan.amount.toString(),
      interestRate: loan.interestRate?.toString() || '0',
      term: loan.term?.toString() || '',
      startDate: new Date(loan.startDate).toISOString().split('T')[0],
      loanType: loan.loanType || 'personal',
      cardNumber: loan.cardNumber || '',
      creditLimit: loan.creditLimit?.toString() || '',
      _id: loan._id
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditLoanData({
      borrowerName: '',
      amount: '',
      interestRate: '',
      term: '',
      startDate: '',
      loanType: '',
      cardNumber: '',
      creditLimit: '',
      _id: null
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!editLoanData.borrowerName || !editLoanData.amount || !editLoanData.startDate) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        return;
      }

      let submitData = {
        borrowerName: editLoanData.borrowerName,
        amount: Number(editLoanData.amount),
        startDate: editLoanData.startDate,
        loanType: editLoanData.loanType
      };

      if (editLoanData.loanType === 'creditCard') {
        if (!editLoanData.cardNumber) {
          setSnackbar({
            open: true,
            message: 'Card number is required for credit cards',
            severity: 'error'
          });
          return;
        }
        submitData = {
          ...submitData,
          cardNumber: editLoanData.cardNumber,
          creditLimit: Number(editLoanData.creditLimit || editLoanData.amount),
          interestRate: 0
        };
      } else {
        if (!editLoanData.interestRate) {
          setSnackbar({
            open: true,
            message: 'Interest rate is required',
            severity: 'error'
          });
          return;
        }
        submitData = {
          ...submitData,
          interestRate: Number(editLoanData.interestRate)
        };

        if (editLoanData.loanType === 'personal') {
          if (!editLoanData.term) {
            setSnackbar({
              open: true,
              message: 'Term is required for personal loans',
              severity: 'error'
            });
            return;
          }
          submitData.term = Number(editLoanData.term);
        }
      }

      await loans.update(editLoanData._id, submitData);
      await fetchLoans();
      handleEditClose();
      setSnackbar({
        open: true,
        message: `${editLoanData.loanType === 'creditCard' ? 'Credit Card' : 
                 editLoanData.loanType === 'gold' ? 'Gold Loan' : 'Personal Loan'} updated successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating loan:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteOpen = (loan) => {
    setDeleteLoan(loan);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteLoan(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await loans.delete(deleteLoan._id);
      setSnackbar({
        open: true,
        message: 'Loan deleted successfully',
        severity: 'success'
      });
      fetchLoans();
      handleDeleteClose();
    } catch (error) {
      console.error('Error deleting loan:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleNewLoanOpen = (type) => {
    setFormData({
      borrowerName: '',
      amount: '',
      interestRate: '',
      term: '',
      startDate: '',
      loanType: type,
      creditLimit: '',
      cardNumber: ''
    });
    setOpen(true);
  };

  const handlePaymentDialogOpen = (loan) => {
    if (!loan || !loan._id) {
      setSnackbar({
        open: true,
        message: 'Invalid loan selected',
        severity: 'error'
      });
      return;
    }
    setSelectedPaymentLoan(loan._id);
    setPaymentDialogOpen(true);
    setPaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      borrowerName: loan.borrowerName,
      loanAmount: loan.amount
    });
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setSelectedPaymentLoan(null);
    setPaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePaymentSubmit = async () => {
    try {
      if (!selectedPaymentLoan) {
        setSnackbar({
          open: true,
          message: 'No loan selected for payment',
          severity: 'error'
        });
        return;
      }

      if (!paymentData.amount || !paymentData.date) {
        setSnackbar({
          open: true,
          message: 'Please fill in all fields',
          severity: 'error'
        });
        return;
      }

      const amount = Number(paymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be a positive number',
          severity: 'error'
        });
        return;
      }

      const response = await loans.addPayment(selectedPaymentLoan, {
        amount: amount,
        date: paymentData.date
      });
      
      if (response.data) {
        await fetchLoans();
        setSnackbar({
          open: true,
          message: 'Payment added successfully',
          severity: 'success'
        });
        handlePaymentDialogClose();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleSpentSubmit = async () => {
    try {
      if (!selectedLoan) {
        setSnackbar({
          open: true,
          message: 'Error: No card selected',
          severity: 'error'
        });
        return;
      }

      const response = await loans.addSpent(selectedLoan, {
        amount: Number(spentData.amount),
        date: spentData.date,
        description: spentData.description
      });
      
      if (response.data) {
        setSnackbar({
          open: true,
          message: 'Spent amount added successfully',
          severity: 'success'
        });
        fetchLoans();
        handleSpentDialogClose();
      }
    } catch (error) {
      console.error('Error adding spent:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleSpentDialogClose = () => {
    setSpentDialogOpen(false);
    setSpentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setSelectedLoan(null);
  };

  const renderLoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <CircularProgress />
    </Box>
  );

  const renderErrorState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <Alert severity="error" sx={{ width: '100%', maxWidth: '600px' }}>
        {error}
      </Alert>
    </Box>
  );

  const renderPersonalLoans = () => (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 1, sm: 2 } }}>
      {/* Personal Loans Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Personal Loans
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/personal-loans/outstandings')}
          >
            Outstandings
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormData(prev => ({ ...prev, loanType: 'personal' }));
              handleOpen();
            }}
          >
            Add Personal Loan
          </Button>
        </Box>
      </Box>

      {loading ? renderLoadingState() : 
       error ? renderErrorState() :
       <Grid container spacing={{ xs: 2, sm: 3 }}>
         {personalLoans.length === 0 ? (
           <Grid item xs={12}>
             <Alert severity="info" sx={{ width: '100%' }}>
               No personal loans found. Add a new loan to get started.
             </Alert>
           </Grid>
         ) : (
           personalLoans.map((loan) => (
             <Grid item xs={12} sm={6} md={4} key={loan._id}>
               <Card 
                 sx={{
                   height: '100%',
                   display: 'flex',
                   flexDirection: 'column',
                   '&:hover': {
                     boxShadow: 6
                   }
                 }}
               >
                 <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                     <Typography variant="h6" component="div" sx={{ 
                       fontWeight: 600,
                       fontSize: { xs: '1rem', sm: '1.1rem' }
                     }}>
                       {loan.borrowerName}
                     </Typography>
                     <Chip
                       label={loan.status}
                       color={getStatusColor(loan.status)}
                       size="small"
                     />
                   </Box>
                   <Divider sx={{ my: 2 }} />
                   <Grid container spacing={{ xs: 1, sm: 2 }}>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Loan Amount
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           ₹{loan.amount.toLocaleString()}
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Interest Rate
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {loan.interestRate}%
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Term
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {loan.term} months
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           EMI Amount
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           ₹{calculateEMI(loan.amount, loan.interestRate, loan.term).toLocaleString()}
                         </Typography>
                       </Box>
                     </Grid>
                   </Grid>
                 </CardContent>
                 <CardActions sx={{ mt: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                   <Button
                     fullWidth
                     variant="contained"
                     color="primary"
                     startIcon={<VisibilityIcon />}
                     onClick={() => handleViewDetails(loan._id)}
                   >
                     View Details
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     color="primary"
                     startIcon={<EditIcon />}
                     onClick={() => handleEditOpen(loan)}
                   >
                     Edit Loan
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     color="error"
                     onClick={() => handleDeleteOpen(loan)}
                   >
                     Delete Loan
                   </Button>
                 </CardActions>
               </Card>
             </Grid>
           ))
         )}
       </Grid>
      }
    </Box>
  );

  const renderGoldLoans = () => (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 1, sm: 2 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            background: 'linear-gradient(45deg, #b8860b 30%, #daa520 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Gold Loans
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexWrap: 'wrap',
          ml: { sm: 'auto' }
        }}>
          <Button
            variant="contained"
            onClick={() => {
              setFormData(prev => ({ ...prev, loanType: 'gold' }));
              setOpen(true);
            }}
            sx={{
              bgcolor: '#b8860b',
              color: 'white',
              '&:hover': {
                bgcolor: '#daa520'
              }
            }}
          >
            Add Gold Loan
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/gold-loans/outstandings')}
            sx={{
              bgcolor: '#b8860b',
              color: 'white',
              '&:hover': {
                bgcolor: '#daa520'
              }
            }}
          >
            Outstandings
          </Button>
        </Box>
      </Box>

      {loading ? renderLoadingState() : 
       error ? renderErrorState() :
       <Grid container spacing={{ xs: 2, sm: 3 }}>
         {goldLoans.length === 0 ? (
           <Grid item xs={12}>
             <Alert severity="info" sx={{ width: '100%' }}>
               No gold loans found. Add a new loan to get started.
             </Alert>
           </Grid>
         ) : (
           goldLoans.map((loan) => (
             <Grid item xs={12} sm={6} md={4} key={loan._id}>
               <Card 
                 sx={{
                   height: '100%',
                   display: 'flex',
                   flexDirection: 'column',
                   '&:hover': {
                     boxShadow: 6
                   }
                 }}
               >
                 <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                     <Typography variant="h6" component="div" sx={{ 
                       fontWeight: 600,
                       fontSize: { xs: '1rem', sm: '1.1rem' }
                     }}>
                       {loan.borrowerName}
                     </Typography>
                     <Chip
                       label={loan.status}
                       color={getStatusColor(loan.status)}
                       size="small"
                     />
                   </Box>
                   <Divider sx={{ my: 2 }} />
                   <Grid container spacing={{ xs: 1, sm: 2 }}>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(180, 83, 9, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Loan Amount
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           ₹{loan.amount.toLocaleString()}
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(180, 83, 9, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Interest Rate
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {loan.interestRate}%
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={12}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(180, 83, 9, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Start Date
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {new Date(loan.startDate).toLocaleDateString()}
                         </Typography>
                       </Box>
                     </Grid>
                   </Grid>
                 </CardContent>
                 <CardActions sx={{ mt: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                   <Button
                     fullWidth
                     variant="contained"
                     startIcon={<VisibilityIcon />}
                     onClick={() => handleViewDetails(loan._id)}
                     sx={{ 
                       bgcolor: '#b45309',
                       '&:hover': {
                         bgcolor: '#a34808',
                       }
                     }}
                   >
                     View Details
                   </Button>
                   <Button
                     fullWidth
                     variant="contained"
                     startIcon={<PaymentIcon />}
                     onClick={() => handlePaymentDialogOpen(loan)}
                     sx={{
                       bgcolor: '#b45309',
                       '&:hover': {
                         bgcolor: '#a34808',
                       }
                     }}
                   >
                     Make Payment
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     startIcon={<EditIcon />}
                     onClick={() => handleEditOpen(loan)}
                     sx={{
                       borderColor: '#b45309',
                       color: '#b45309',
                       '&:hover': {
                         borderColor: '#a34808',
                         bgcolor: 'rgba(180, 83, 9, 0.04)',
                       }
                     }}
                   >
                     Edit Loan
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     color="error"
                     onClick={() => handleDeleteOpen(loan)}
                   >
                     Delete Loan
                   </Button>
                 </CardActions>
               </Card>
             </Grid>
           ))
         )}
       </Grid>
      }
    </Box>
  );

  const renderCreditCards = () => (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 1, sm: 2 } }}>
      {/* Credit Cards Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Credit Cards
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleNewLoanOpen('creditCard')}
          sx={{ ml: 'auto' }}
        >
          Add Credit Card
        </Button>
      </Box>

      {loading ? renderLoadingState() : 
       error ? renderErrorState() :
       <Grid container spacing={{ xs: 2, sm: 3 }}>
         {creditCards.length === 0 ? (
           <Grid item xs={12}>
             <Alert severity="info" sx={{ width: '100%' }}>
               No credit cards found. Add a new card to get started.
             </Alert>
           </Grid>
         ) : (
           creditCards.map((card) => (
             <Grid item xs={12} sm={6} md={4} key={card._id}>
               <Card 
                 sx={{
                   height: '100%',
                   display: 'flex',
                   flexDirection: 'column',
                   '&:hover': {
                     boxShadow: 6
                   }
                 }}
               >
                 <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                     <Typography variant="h6" component="div" sx={{ 
                       fontWeight: 600,
                       fontSize: { xs: '1rem', sm: '1.1rem' }
                     }}>
                       {card.borrowerName}
                     </Typography>
                     <Chip
                       label={card.status}
                       color={getStatusColor(card.status)}
                       size="small"
                     />
                   </Box>
                   <Divider sx={{ my: 2 }} />
                   <Grid container spacing={{ xs: 1, sm: 2 }}>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Loan Amount
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           ₹{(card.amount || 0).toLocaleString()}
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Interest Rate
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {card.interestRate}%
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Credit Limit
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           ₹{(card.creditLimit || 0).toLocaleString()}
                         </Typography>
                       </Box>
                     </Grid>
                     <Grid item xs={6}>
                       <Box sx={{ 
                         p: { xs: 1, sm: 2 }, 
                         borderRadius: 1, 
                         bgcolor: 'rgba(37, 99, 235, 0.05)',
                         textAlign: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary">
                           Card Number
                         </Typography>
                         <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                           {card.cardNumber}
                         </Typography>
                       </Box>
                     </Grid>
                   </Grid>
                 </CardContent>
                 <CardActions sx={{ mt: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                   <Button
                     fullWidth
                     variant="contained"
                     color="primary"
                     startIcon={<VisibilityIcon />}
                     onClick={() => handleViewDetails(card._id)}
                   >
                     View Details
                   </Button>
                   <Button
                     fullWidth
                     variant="contained"
                     color="secondary"
                     startIcon={<PaymentIcon />}
                     onClick={() => handlePaymentDialogOpen(card)}
                   >
                     Make Payment
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     color="primary"
                     startIcon={<EditIcon />}
                     onClick={() => handleEditOpen(card)}
                   >
                     Edit Loan
                   </Button>
                   <Button
                     fullWidth
                     variant="outlined"
                     color="error"
                     onClick={() => handleDeleteOpen(card)}
                   >
                     Delete Loan
                   </Button>
                 </CardActions>
               </Card>
             </Grid>
           ))
         )}
       </Grid>
      }
    </Box>
  );

  const handleChange = (event, newValue) => {
    setValue(newValue);
    navigate(newValue);
  };

  if (selectedLoan) {
    return <LoanDetails loanId={selectedLoan} onBack={handleBackToList} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <ErrorBoundary onRetry={fetchLoans}>
        <div className={classes.root}>
          <AppBar position="static" className={classes.appBar}>
            <Toolbar className={classes.toolbar}>
              <Typography variant="h6" className={classes.title}>
                Loan Management System
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpen}
                className={classes.addButton}
              >
                Add New Loan
              </Button>
            </Toolbar>
            <Tabs
              value={value}
              onChange={handleChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              className={classes.tabContainer}
            >
              <Tab label="Personal Loans" className={classes.tab} />
              <Tab label="Gold Loans" className={classes.tab} />
              <Tab label="Credit Cards" className={classes.tab} />
            </Tabs>
          </AppBar>

          <Container>
            <Routes>
              <Route path="/" element={<Navigate to="/personal-loans" replace />} />
              <Route path="/personal-loans" element={renderPersonalLoans()} />
              <Route path="/personal-loans/outstandings" element={<PersonalLoanOutstandings />} />
              <Route path="/gold-loans" element={renderGoldLoans()} />
              <Route path="/gold-loans/outstandings" element={<GoldLoanOutstandings />} />
              <Route path="/credit-cards" element={renderCreditCards()} />
              <Route path="/loans/:id" element={<LoanDetails onBack={() => navigate(-1)} />} />
            </Routes>
          </Container>

          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogContent className={classes.dialogContent}>
              <Box component="form" sx={{ mt: 2 }}>
                {renderDialogContent()}
              </Box>
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              <Button onClick={handleClose} color="primary" className={classes.button}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} color="primary" className={classes.button}>
                Submit
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={prepaymentOpen} onClose={handlePrepaymentClose} maxWidth="sm" fullWidth>
            <DialogTitle>Prepay Loan</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Borrower: {prepaymentData.borrowerName}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Current Balance: ₹{prepaymentData.loanAmount?.toLocaleString()}
                </Typography>
                <TextField
                  fullWidth
                  label="Prepayment Amount"
                  name="amount"
                  type="number"
                  value={prepaymentData.amount}
                  onChange={(e) => setPrepaymentData({ ...prepaymentData, amount: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Prepayment Date"
                  name="date"
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
              <Button onClick={handlePrepaymentSubmit} variant="contained" color="primary">
                Process Prepayment
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              Edit {editLoanData.loanType === 'creditCard' ? 'Credit Card' : 
                    editLoanData.loanType === 'gold' ? 'Gold Loan' : 'Personal Loan'}
            </DialogTitle>
            <DialogContent>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label={editLoanData.loanType === 'creditCard' ? "Credit Card Name" : "Borrower Name"}
                  name="borrowerName"
                  value={editLoanData.borrowerName}
                  onChange={(e) => setEditLoanData({ ...editLoanData, borrowerName: e.target.value })}
                  margin="normal"
                  required
                />
                {editLoanData.loanType === 'creditCard' ? (
                  <>
                    <TextField
                      fullWidth
                      label="Credit Limit"
                      name="amount"
                      type="number"
                      value={editLoanData.amount}
                      onChange={(e) => setEditLoanData({ ...editLoanData, amount: e.target.value, creditLimit: e.target.value })}
                      margin="normal"
                      required
                    />
                    <TextField
                      fullWidth
                      label="Card Number"
                      name="cardNumber"
                      value={editLoanData.cardNumber}
                      onChange={(e) => setEditLoanData({ ...editLoanData, cardNumber: e.target.value })}
                      margin="normal"
                      required
                      inputProps={{ maxLength: 16 }}
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      label="Loan Amount"
                      name="amount"
                      type="number"
                      value={editLoanData.amount}
                      onChange={(e) => setEditLoanData({ ...editLoanData, amount: e.target.value })}
                      margin="normal"
                      required
                    />
                    <TextField
                      fullWidth
                      label="Interest Rate (%)"
                      name="interestRate"
                      type="number"
                      value={editLoanData.interestRate}
                      onChange={(e) => setEditLoanData({ ...editLoanData, interestRate: e.target.value })}
                      margin="normal"
                      required
                    />
                    {editLoanData.loanType === 'personal' && (
                      <TextField
                        fullWidth
                        label="Term (months)"
                        name="term"
                        type="number"
                        value={editLoanData.term}
                        onChange={(e) => setEditLoanData({ ...editLoanData, term: e.target.value })}
                        margin="normal"
                        required
                      />
                    )}
                  </>
                )}
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={editLoanData.startDate}
                  onChange={(e) => setEditLoanData({ ...editLoanData, startDate: e.target.value })}
                  margin="normal"
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose}>Cancel</Button>
              <Button 
                onClick={handleEditSubmit} 
                variant="contained"
                sx={editLoanData.loanType === 'gold' ? {
                  bgcolor: '#b45309',
                  '&:hover': {
                    bgcolor: '#a34808',
                  }
                } : {}}
              >
                Save Changes
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
            <DialogTitle>Delete Loan</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this loan? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteClose}>Cancel</Button>
              <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={paymentDialogOpen} onClose={handlePaymentDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogContent>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Date"
                  name="date"
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
            <DialogActions>
              <Button onClick={handlePaymentDialogClose}>Cancel</Button>
              <Button onClick={handlePaymentSubmit} variant="contained">
                Make Payment
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={spentDialogOpen} onClose={handleSpentDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Spent Amount</DialogTitle>
            <DialogContent>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={spentData.amount}
                  onChange={(e) => setSpentData({ ...spentData, amount: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={spentData.description}
                  onChange={(e) => setSpentData({ ...spentData, description: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Date"
                  name="date"
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
            <DialogActions>
              <Button onClick={handleSpentDialogClose}>Cancel</Button>
              <Button onClick={handleSpentSubmit} variant="contained">
                Add Spent
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={6000} 
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleSnackbarClose} 
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App; 