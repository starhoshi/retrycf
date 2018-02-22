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

```ts
export const updateTestOrder = functions.firestore.document(`order/{orderID}`).onUpdate(async event => {
  const retryStatus = Retrycf.retryStatus(event.data.data(), event.data.previous.data())
  switch (retryStatus) {
      case Retrycf.Status.ShouldRetry:
      case Retrycf.Status.ShouldNotRetry:
          break
      case Retrycf.Status.RetryFailed:
          throw Error('Retry failed')
      default:
          break
  }
  
  try {
    await main(order)
    return undefined
  } catch (e) {
    await Retrycf.setRetry(event.data.ref, event.data.data(), e)
    return Promise.reject(e)
  }
})
```
