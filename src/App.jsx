import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './Layout';
import Home from './pages/Home';
import Protocols from './pages/Protocols';
import Search from './pages/Search';
import History from './pages/History';
import Credits from './pages/Credits';
import Calculator from './pages/Calculator';
import Publicidade from './pages/Publicidade';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // O app é público para leitura; o login só é exigido para publicar e
  // para as funções de administrador. Por isso o Layout (que era aplicado
  // automaticamente pelo Base44) agora envolve as páginas aqui.
  const withLayout = (page) => <Layout>{page}</Layout>;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/ForgotPassword" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/ResetPassword" element={<ResetPassword />} />
      <Route path="/" element={withLayout(<Home />)} />
      <Route path="/Home" element={withLayout(<Home />)} />
      <Route path="/Protocols" element={withLayout(<Protocols />)} />
      <Route path="/Search" element={withLayout(<Search />)} />
      <Route path="/History" element={withLayout(<History />)} />
      <Route path="/Credits" element={withLayout(<Credits />)} />
      <Route path="/Calculator" element={withLayout(<Calculator />)} />
      <Route path="/Publicidade" element={withLayout(<Publicidade />)} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
