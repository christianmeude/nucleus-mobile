export type LoginIntent = 'student' | 'faculty';

let currentIntent: LoginIntent | null = null;
let rejectionMessage: string | null = null;

export const setLoginIntent = (intent: LoginIntent | null): void => {
  currentIntent = intent;
};

export const getLoginIntent = (): LoginIntent | null => currentIntent;

export const setLoginRejection = (message: string): void => {
  rejectionMessage = message;
};

export const consumeLoginRejection = (): string | null => {
  const message = rejectionMessage;
  rejectionMessage = null;
  return message;
};
