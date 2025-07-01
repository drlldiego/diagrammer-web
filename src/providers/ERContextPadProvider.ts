export class ERContextPadProvider {
  constructor(contextPad: any) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries() {
    return {};
  }
}