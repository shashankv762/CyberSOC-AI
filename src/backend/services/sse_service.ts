import { Response } from 'express';

class SSEService {
  private clients = new Set<Response>();

  addClient(res: Response) {
    this.clients.add(res);
  }

  removeClient(res: Response) {
    this.clients.delete(res);
  }

  broadcast(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
        try {
            client.write(payload);
        } catch (e) {
            this.removeClient(client);
        }
    });
  }
}

export const sseService = new SSEService();
