export enum Status {
  none = 0,
  success = 1,
  failure = 2
}

export interface INeoTask {
  status: Status
  invalid?: { validationError: string, reason: string }
  retry?: { error: any[], count: number }
  fatal?: { step: string, error: string }
}
