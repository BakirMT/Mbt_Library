import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Tenant, TenantSession, UserRole } from '../types/saas';
import { saasStorage } from '../services/storage';

export type RouteType = 
  | 'home'
  | 'plans'
  | 'features'
  | 'contact'
  | 'login'
  | 'register'
  | 'verify'
  | 'checkout'
  | 'super_admin'
  | 'super_admin_login'
  | 'tenant_landing'
  | 'tenant_admin_portal'
  | 'tenant_librarian_portal'
  | 'tenant_student_portal'
  | 'tenant_admin_login'
  | 'tenant_librarian_login'
  | 'tenant_student_login'
  | 'accept_invitation'
  | 'not_found';

interface ParsedRoute {
  type: RouteType;
  path: string;
  tenantSlug?: string;
  inviteToken?: string;
  tab?: string;
  subTab?: string;
}

interface RouterContextValue {
  currentPath: string;
  route: ParsedRoute;
  navigate: (path: string) => void;
  superAdminUser: User | null;
  loginSuperAdmin: (email: string) => boolean;
  logoutSuperAdmin: () => void;
  activeTenant: Tenant | null;
  tenantSession: TenantSession | null;
  loginTenantUser: (
    slug: string,
    email: string,
    password: string,
    requestedRole?: UserRole
  ) => { success: boolean; session?: TenantSession; error?: string };
  logoutTenantUser: (slug: string) => void;
  refreshTenantSession: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function parsePath(pathname: string, search: string): ParsedRoute {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const urlParams = new URLSearchParams(search);
  const tab = urlParams.get('tab') || undefined;
  const subTab = urlParams.get('subTab') || undefined;

  if (cleanPath === '/' || cleanPath === '/home') {
    return { type: 'home', path: cleanPath };
  }
  if (cleanPath === '/plans') {
    return { type: 'plans', path: cleanPath };
  }
  if (cleanPath === '/features') {
    return { type: 'features', path: cleanPath };
  }
  if (cleanPath === '/contact') {
    return { type: 'contact', path: cleanPath };
  }
  if (cleanPath === '/auth/login' || cleanPath === '/login') {
    return { type: 'login', path: cleanPath };
  }
  if (cleanPath === '/auth/register' || cleanPath === '/register') {
    return { type: 'register', path: cleanPath };
  }
  if (cleanPath === '/auth/verify' || cleanPath === '/verify') {
    return { type: 'verify', path: cleanPath };
  }
  if (cleanPath === '/subscription/checkout' || cleanPath === '/checkout') {
    return { type: 'checkout', path: cleanPath };
  }

  // 1. Super Admin Portal
  if (cleanPath === '/super-admin' || cleanPath.startsWith('/super-admin/')) {
    return {
      type: 'super_admin',
      path: cleanPath,
      tab: tab || 'overview',
      subTab,
    };
  }

  if (cleanPath === '/super-admin-login') {
    return {
      type: 'super_admin_login',
      path: cleanPath,
    };
  }

  // 2. Invitation token: /invite/:token
  if (cleanPath.startsWith('/invite/')) {
    const token = cleanPath.replace('/invite/', '').split('/')[0];
    return {
      type: 'accept_invitation',
      path: cleanPath,
      inviteToken: token,
    };
  }

  // 3. Tenant routes (/l/:slug/...)
  if (cleanPath.startsWith('/l/')) {
    const parts = cleanPath.replace('/l/', '').split('/');
    const slug = parts[0];
    const subRoute = parts.slice(1).join('/');

    // Login routes
    if (subRoute === 'admin/login') {
      return { type: 'tenant_admin_login', path: cleanPath, tenantSlug: slug };
    }
    if (subRoute === 'librarian/login') {
      return { type: 'tenant_librarian_login', path: cleanPath, tenantSlug: slug };
    }
    if (subRoute === 'student/login') {
      return { type: 'tenant_student_login', path: cleanPath, tenantSlug: slug };
    }

    // Portal routes
    if (subRoute === 'admin' || subRoute.startsWith('admin/')) {
      return { type: 'tenant_admin_portal', path: cleanPath, tenantSlug: slug, tab: tab || 'dashboard' };
    }
    if (subRoute === 'librarian' || subRoute.startsWith('librarian/')) {
      return { type: 'tenant_librarian_portal', path: cleanPath, tenantSlug: slug, tab: tab || 'circulation' };
    }
    if (subRoute === 'student' || subRoute.startsWith('student/')) {
      return { type: 'tenant_student_portal', path: cleanPath, tenantSlug: slug, tab: tab || 'my_books' };
    }

    return {
      type: 'tenant_landing',
      path: cleanPath,
      tenantSlug: slug,
    };
  }

  return {
    type: 'not_found',
    path: cleanPath,
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/super-admin');
  const [searchParams, setSearchParams] = useState<string>(() => window.location.search || '');
  const [sessionNonce, setSessionNonce] = useState(0);

  // Super Admin session
  const [superAdminUser, setSuperAdminUser] = useState<User | null>(() => {
    const superUser = saasStorage.getSuperAdminUser();
    const saved = localStorage.getItem('mbt_super_admin_authenticated');
    if (saved === 'true') {
      return superUser;
    }
    return superUser;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/super-admin');
      setSearchParams(window.location.search || '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    const [pathPart, queryPart] = path.split('?');
    window.history.pushState({}, '', path);
    setCurrentPath(pathPart || '/');
    setSearchParams(queryPart ? `?${queryPart}` : '');
  }, []);

  const loginSuperAdmin = useCallback((email: string): boolean => {
    const admin = saasStorage.authenticateSuperAdmin(email);
    if (admin) {
      setSuperAdminUser(admin);
      localStorage.setItem('mbt_super_admin_authenticated', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutSuperAdmin = useCallback(() => {
    setSuperAdminUser(null);
    localStorage.removeItem('mbt_super_admin_authenticated');
    navigate('/super-admin-login');
  }, [navigate]);

  const route = useMemo(() => {
    return parsePath(currentPath, searchParams);
  }, [currentPath, searchParams]);

  const activeTenant = useMemo(() => {
    if (route.tenantSlug) {
      return saasStorage.getTenantBySlug(route.tenantSlug) || null;
    }
    return null;
  }, [route.tenantSlug]);

  const tenantSession = useMemo(() => {
    if (route.tenantSlug) {
      return saasStorage.getTenantSession(route.tenantSlug);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.tenantSlug, sessionNonce]);

  const refreshTenantSession = useCallback(() => {
    setSessionNonce((n) => n + 1);
  }, []);

  const loginTenantUser = useCallback(
    (slug: string, email: string, password: string, requestedRole?: UserRole) => {
      const res = saasStorage.authenticateTenantUser(slug, email, password, requestedRole);
      if (res.success) {
        refreshTenantSession();
      }
      return res;
    },
    [refreshTenantSession]
  );

  const logoutTenantUser = useCallback(
    (slug: string) => {
      saasStorage.signOutTenant(slug);
      refreshTenantSession();
      navigate(`/l/${slug}`);
    },
    [navigate, refreshTenantSession]
  );

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        route,
        navigate,
        superAdminUser,
        loginSuperAdmin,
        logoutSuperAdmin,
        activeTenant,
        tenantSession,
        loginTenantUser,
        logoutTenantUser,
        refreshTenantSession,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
