import { inputType } from '../enum';

export interface FlowData {
  type: inputType,
  message: string
}

export interface CommitMessage {
  subject: string,
  body: string
}

export interface CommandResponse {
  data: string,
  code: number
}
