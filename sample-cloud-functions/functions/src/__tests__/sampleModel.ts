import * as Retrycf from 'retrycf'
import { Pring, property } from 'pring'

export class RetryOrder extends Pring.Base implements Retrycf.HasNeoTask {
  @property neoTask?: Retrycf.NeoTask | undefined
  @property skus: Pring.ReferenceCollection<RetrySKU> = new Pring.ReferenceCollection(this)
}

export class RetrySKU extends Pring.Base {
  @property price = 4000
  @property stock = 100
  @property index = 0
}
