import { createBrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import PickupPage from './PickupPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerList from './pages/CustomerList.jsx'
import CustomerDetail from './pages/CustomerDetail.jsx'

function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 text-lg">
      {title} — 即将实现
    </div>
  )
}

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
        path: 'logs',
        element: <PlaceholderPage title="操作日志" />,
      },
    ],
  },
  {
    path: '/status',
    element: <PlaceholderPage title="客户自助查询" />,
  },
])

export default router

