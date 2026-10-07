import { TimeoutError, withTimeout } from '../withTimeout';

describe('utils/withTimeout', () => {
  it('resolves with the wrapped value when it settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'probe')).resolves.toBe('ok');
  });

  it('rejects with TimeoutError when the wrapped promise hangs', async () => {
    const hanging = new Promise<string>(() => {});
    await expect(withTimeout(hanging, 20, 'Profile lookup')).rejects.toThrow(TimeoutError);
  });

  it('names the timed-out operation in the message', async () => {
    const hanging = new Promise<string>(() => {});
    await expect(withTimeout(hanging, 20, 'Session restore')).rejects.toThrow(
      /Session restore timed out/,
    );
  });
});
