<p align="center">
    <img src="https://raw.githubusercontent.com/starhoshi/retrycf/master/docs/logo.png" width='250px' />
</p>

# retrycf [![npm version](https://badge.fury.io/js/retrycf.svg)](https://badge.fury.io/js/retrycf) [![Build Status](https://travis-ci.org/starhoshi/retrycf.svg?branch=master)](https://travis-ci.org/starhoshi/retrycf) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/cb022ff28cab4b0085eb64f07f37a8bb)](https://www.codacy.com/app/kensuke1751/retrycf?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=starhoshi/retrycf&amp;utm_campaign=Badge_Grade) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

retrycf is an npm library that fire Cloud Functions again when it fails.

## Install

```
yarn install retrycf
```

## Usage

Sample code is [here](https://github.com/starhoshi/retrycf/blob/master/sample-cloud-functions/functions/src/index.ts).

* Retrycf.NeoTask.shouldRetry(order, preOrder)
  * return boolean
* Retrycf.NeoTask.setRetry(order, 'createTestOrder', e)
  * If An Error occured, set retry trigger


```ts
export const updateTestOrder = functions.firestore.document(`${Model.RetryOrder.getPath()}/{testOrderID}`).onUpdate(async event => {
  const order = new Model.RetryOrder()
  order.init(event.data)
  const preOrder = new Model.RetryOrder()
  preOrder.init(event.data.previous)

  try {
    const shouldRetry = Retrycf.NeoTask.shouldRetry(order, preOrder)
    await Retrycf.NeoTask.setFatalIfRetryCountIsMax(order)

    if (!shouldRetry) {
      return undefined
    }

    await main(order)
    return undefined
  } catch (e) {
    const neoTask = await Retrycf.NeoTask.setRetry(order, 'createTestOrder', e)
    throw e
  }
})
```

## Retry Count

If retry fails twice, fatal error is set.
