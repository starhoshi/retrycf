import * as Retrycf from '../retrycf'
import { Pring, property } from 'pring'

export class SampleOrder extends Pring.Base implements Retrycf.HasNeoTask {
  @property name: string = ''
  @property neoTask?: Retrycf.PNeoTask | undefined
}
