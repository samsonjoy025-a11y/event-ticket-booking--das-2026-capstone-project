export function createHealthController({ clock = () => new Date() } = {}) {
  return Object.freeze({
    getHealth() {
      return {
        status: 'ok',
        service: 'event-ticketing-platform',
        timestamp: new Date(clock()).toISOString(),
      };
    },
  });
}