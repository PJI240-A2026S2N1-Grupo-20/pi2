import axios from 'axios';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const api = axios.create({
  // Em produção, o nginx encaminha /api para o backend.
  // Em desenvolvimento, o Vite faz proxy (ver vite.config.js).
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
