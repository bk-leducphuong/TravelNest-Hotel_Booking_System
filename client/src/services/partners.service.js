import http from './http';

export const PartnersService = {
  /**
   * GET /api/v1/partners/links
   * Returns the outbound affiliate deep link for a partner service. The
   * affiliate id and URL template stay on the server.
   */
  getLink(service, params = {}) {
    return http.get('/partners/links', { params: { service, ...params } });
  },
};

export default PartnersService;
