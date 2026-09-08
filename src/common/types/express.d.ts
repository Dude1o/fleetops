declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};
