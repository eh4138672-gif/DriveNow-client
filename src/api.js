// כל הקריאות לשרת עוברות כאן. ה-JWT נשמר ב-localStorage ונשלח ב-header של כל בקשה
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// כתובת השרת. בפיתוח ריקה, והבקשות עוברות דרך ה-proxy של Vite.
// בענן נקבעת בזמן הבנייה במשתנה VITE_API_URL, למשל https://drivenow-api.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const auth = {
  getUser() {
    try {
      const user = JSON.parse(localStorage.getItem(USER_KEY));
      if (user && new Date(user.expiresAt) > new Date()) {
        return user;
      }
    } catch {
      // ערך פגום - מתנהגים כאילו אין משתמש
    }
    auth.clear();
    return null;
  },
  save(response) {
    const { token, ...user } = response;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // token שפג תוקפו - חוזרים למסך ההתחברות
    if (response.status === 401 && token) {
      auth.clear();
      onUnauthorized();
    }
    throw new ApiError(response.status, errorMessage(response.status, data));
  }
  return data;
}

// השרת מחזיר ProblemDetails: detail לשגיאה עסקית, errors לשגיאות ולידציה
function errorMessage(status, data) {
  if (data?.errors) {
    return Object.values(data.errors).flat().join(' ');
  }
  if (data?.detail) {
    return data.detail;
  }
  if (status === 401) return 'יש להתחבר מחדש';
  if (status === 403) return 'אין לך הרשאה לפעולה הזאת';
  return `שגיאה ${status}`;
}

const query = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (details) => request('/auth/register', { method: 'POST', body: details }),
  getCars: (params) => request(`/cars?${query(params)}`),
  getFeatures: () => request('/features'),
  // ניהול רכבים - מנהל בלבד (השרת אוכף)
  createCar: (car) => request('/cars', { method: 'POST', body: car }),
  setCarAvailability: (id, isActive) => request(`/cars/${id}/availability`, { method: 'PATCH', body: { isActive } }),
  deleteCar: (id) => request(`/cars/${id}`, { method: 'DELETE' }),
  getRentals: (params) => request(`/rentals?${query(params)}`),
  createRental: (rental) => request('/rentals', { method: 'POST', body: rental }),
  deleteRental: (id) => request(`/rentals/${id}`, { method: 'DELETE' }),
};
