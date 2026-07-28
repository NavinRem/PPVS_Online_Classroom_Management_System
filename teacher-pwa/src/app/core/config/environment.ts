const hostname =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : 'localhost';

const isHttpsTunnel =
  typeof window !== 'undefined' &&
  window.location?.protocol === 'https:' &&
  !window.location.hostname.includes('localhost');

export const environment = {
  production: false,
  apiUrl: isHttpsTunnel ? '' : `http://${hostname}:3000`,
  appName: 'PPVS Classroom PWA',
};
