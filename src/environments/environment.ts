export const environment = {
  production: false,
  baseUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:9015/dds'
    : `http://${window.location.hostname}:9015/dds`

};
