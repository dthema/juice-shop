/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import challengeUtils = require('../lib/challengeUtils')
import * as utils from '../lib/utils'
import { challenges } from '../data/datacache'
const security = require('../lib/insecurity')

module.exports = function b2bOrder () {
  return ({ body }: Request, res: Response, next: NextFunction) => {
    if (utils.isChallengeEnabled(challenges.rceChallenge) || utils.isChallengeEnabled(challenges.rceOccupyChallenge)) {
      const orderLinesData = body.orderLinesData || ''

      if (orderLinesData.trim() !== '') {
        try {
          const parsedData = JSON.parse(orderLinesData)
        } catch (err) {
          return next(new Error('Invalid orderLinesData format'))
        }
      }

      res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
    } else {
      res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
    }
  }

  function uniqueOrderNumber () {
    return security.hash(`${new Date().toString()}_B2B`)
  }

  function dateTwoWeeksFromNow () {
    return new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString()
  }
}
