import { createBrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import PickupPage from './PickupPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerList from './pages/CustomerList.jsx'
import CustomerDetail from './pages/CustomerDetail.jsx'
import AdminLogs from './pages/AdminLogs.jsx'
import ErrorReports from './pages/ErrorReports.jsx'
import DeviceDetail from './pages/DeviceDetail.jsx'
import Revenue from './pages/Revenue.jsx'
import CustomerStatus from './pages/CustomerStatus.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/pickup',
    element: <PickupPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'customers',
        element: <CustomerList />,
      },
      {
        path: 'customers/:id',
        element: <CustomerDetail />,
      },
      {
        path: 'revenue',
        element: <Revenue />,
      },
      {
        path: 'logs',
        element: <AdminLogs />,
      },
      {
        path: 'error-reports',
        element: <ErrorReports />,
      },
      {
        path: 'devices/:code',
        element: <DeviceDetail />,
      },
    ],
  },
  {
    path: '/status',
    element: <CustomerStatus />,
  },
])

export default router

