import * as Retrycf from 'retrycf'
import { Pring, property } from 'pring'
import * as EventResponse from 'event-response'

export class RetryOrder extends Pring.Base implements Retrycf.HasNeoTask {
  @property neoTask?: Retrycf.NeoTask | undefined
  @property response: EventResponse.IResponse
  @property skus: Pring.ReferenceCollection<RetrySKU> = new Pring.ReferenceCollection(this)
}

export class RetrySKU extends Pring.Base {
  @property price = 4000
  @property stock = 100
  @property index = 0
}

interface PaymentProtocol {}
interface WehbookProtocol {
  post(error: any): Promise<any>
}

class Slack implements WehbookProtocol {
  async post(error: any) {
    // post to slack
  }
}
