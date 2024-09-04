import { Connector, OnConnect, OnDisconnect } from './connectable.js';

describe('connectable', () => {
  describe('Connector', () => {
    it('invokes the given callback on connect', () => {
      const onConnect = jasmine.createSpy<OnConnect>('onConnect');

      const connector = Connector.from(/* isConnected */ () => false);

      connector.connected(onConnect);
      expect(onConnect).not.toHaveBeenCalled();

      connector.connect();
      expect(onConnect).toHaveBeenCalledOnceWith();
    });

    it('invokes the given callback on repeated connections', () => {
      const onConnect = jasmine.createSpy<OnConnect>('onConnect');

      const connector = Connector.from(/* isConnected */ () => false);

      connector.connected(onConnect);
      expect(onConnect).not.toHaveBeenCalled();

      // Called on first connection.
      connector.connect();
      expect(onConnect).toHaveBeenCalledOnceWith();

      onConnect.calls.reset();

      connector.disconnect();
      expect(onConnect).not.toHaveBeenCalled();

      // Called again on second connection.
      connector.connect();
      expect(onConnect).toHaveBeenCalledOnceWith();
    });

    it('invokes the connected disposer on disconnect', () => {
      const onDisconnect = jasmine.createSpy<OnDisconnect>('onDisconnect');

      const connector = Connector.from(/* isConnected */ () => false)

      connector.connected(() => onDisconnect);
      expect(onDisconnect).not.toHaveBeenCalled();

      connector.connect();
      expect(onDisconnect).not.toHaveBeenCalled();

      connector.disconnect();
      expect(onDisconnect).toHaveBeenCalledOnceWith();
    });

    it('refreshes the disconnect listener on each connection', () => {
      const onDisconnect1 = jasmine.createSpy<OnDisconnect>('onDisconnect1');
      const onDisconnect2 = jasmine.createSpy<OnDisconnect>('onDisconnect2');

      const connector = Connector.from(/* isConnected */ () => false);

      connector.connected(jasmine.createSpy().and.returnValues(
        onDisconnect1,
        onDisconnect2,
      ));
      expect(onDisconnect1).not.toHaveBeenCalled();
      expect(onDisconnect2).not.toHaveBeenCalled();

      // First connect.
      connector.connect();
      expect(onDisconnect1).not.toHaveBeenCalled();
      expect(onDisconnect2).not.toHaveBeenCalled();

      // First disconnect should only call the first disconnect listener.
      connector.disconnect();
      expect(onDisconnect1).toHaveBeenCalledOnceWith();
      expect(onDisconnect2).not.toHaveBeenCalled();

      onDisconnect1.calls.reset();

      // Second connect.
      connector.connect();
      expect(onDisconnect1).not.toHaveBeenCalled();
      expect(onDisconnect2).not.toHaveBeenCalled();

      // Second disconnect should only call the second disconnect listener.
      connector.disconnect();
      expect(onDisconnect1).not.toHaveBeenCalled();
      expect(onDisconnect2).toHaveBeenCalledOnceWith();
    });

    it('manages multiple connect callbacks', () => {
      const onConnect1 = jasmine.createSpy<OnConnect>('onConnect1');
      const onConnect2 = jasmine.createSpy<OnConnect>('onConnect2');

      const connector = Connector.from(/* isConnected */ () => false);

      connector.connected(onConnect1);
      connector.connected(onConnect2);

      expect(onConnect1).not.toHaveBeenCalled();
      expect(onConnect2).not.toHaveBeenCalled();

      connector.connect();
      expect(onConnect1).toHaveBeenCalledOnceWith();
      expect(onConnect2).toHaveBeenCalledOnceWith();
    });

    it('invokes the connect callback immediately when already connected', () => {
      const onConnect = jasmine.createSpy<OnConnect>('onConnect');

      const connector = Connector.from(/* isConnected */ () => true);
      connector.connected(onConnect);
      expect(onConnect).toHaveBeenCalledOnceWith();
    });

    it('does not invoke the connect callback when disconnected', () => {
      const onConnect = jasmine.createSpy<OnConnect>('onConnect');

      const connector = Connector.from(/* isConnected */ () => false);

      // Connect and disconnect the element.
      connector.connect();
      connector.disconnect();

      // Should not be called because the element is currently disconnected.
      connector.connected(onConnect);
      expect(onConnect).not.toHaveBeenCalled();

      // Should be called when connected.
      connector.connect();
      expect(onConnect).toHaveBeenCalledOnceWith();
    });
  });
});
