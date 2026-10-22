export class AppMessage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppMessage";
  }
}
