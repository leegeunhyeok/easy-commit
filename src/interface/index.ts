import { inputType } from '../enum';

export interface FlowData {
  type: inputType,
  message: string
}

export interface FlowResponseObject {
  subject: string,
  body: Array<string>
}

export interface CommandResponse {
  data: string,
  code: number
}
